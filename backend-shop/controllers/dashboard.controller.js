const Order = require("../models/order");
const Customer = require("../models/customer");
const Product = require("../models/product");
const Rating = require("../models/rating");
const { serializeOrderAdminSummary } = require("../utils/serializeOrder");
const { getAbandonedCartsStats } = require("./abandonedCart.controller");

/*
  dashboard.controller.js
  ------------------------------------------------------------------
  صفحة "لوحة التحكم" (الرئيسية) - أول صفحة يشوفها الأدمن لحظة الدخول:
  نظرة عامة سريعة على أداء المتجر (10 كروت إحصائية) + رسم "أداء
  المبيعات" التفاعلي + "أحدث الطلبات" + "المنتجات الأكثر مشاهدة"

  -------------------- فلسفة الأرقام هون --------------------
  1) كروت الإحصائيات: كل رقم "حقيقي" منها محسوب لحظيًا (بدون تخزين وسيط)
     بنفس فلسفة "نافذة زمنية متدحرجة" المستخدمة أصلاً بـ
     report.controller.js (آخر 30 يوم مقابل الـ30 يوم اللي قبلها -
     نافذتين بنفس الطول بالضبط عشان المقارنة تفضل عادلة). ما في فلتر
     فترة هون بواجهة المستخدم (بعكس صفحة "التقارير")، فبنستخدم نافذة
     ثابتة (30 يوم) كنظرة عامة افتراضية سريعة لأول ما تفتح الصفحة.

  2) ⚠️ استثناء صريح (بطلب من صاحب المشروع): كارت "الأعضاء المشتركون" لسه
     رقم ثابت (Hardcoded) حاليًا - نظام "العضويات والاشتراكات" لسه ما انبنى
     بالسستم (شوف navItems.js: /memberships لسه صفحة فارغة مؤقتة). لما
     ينبنى فعليًا، بيصير استبدال هالقيمة بحساب حقيقي بنفس أسلوب باقي
     الكروت بالضبط.

     "أرباح التسويق بالعمولة" صار رقم حقيقي (نظام التسويق بالعمولة انبنى
     وصار شغّال فعليًا - شوف adminMarketer.controller.js). ⚠️ مهم: هاد
     الكارت من منظور الأدمن - يعني "قد ايش باع الأدمن عن طريق قناة
     التسويق بالعمولة"، مش "قد ايش المسوّقين قبضوا كعمولة" (هيك حساب تاني
     تمامًا، موجود بصفحة "المسوّقين" نفسها - totalCommission بـ
     getMarketerStats). فمحسوب هون كـ مجموع صافي قيمة المبيعات
     (subtotal - couponDiscount، نفس أساس حساب العمولة بالضبط بـ
     marketerEngine.js، بدون الشحن لأنه مش ربح فعلي للمتجر) لطلبات الفترة
     الحالية مقابل السابقة، ⚠️ بشرط status = "delivered" فقط (مش بس
     استبعاد cancelled/returned متل باقي كروت الإيرادات) - نفس شرط
     "delivered" المستخدم بصفحة "المسوّقين" حتى يبقى الرقم متسق مع باقي
     النظام، بس القيمة المحسوبة هون هي المبيعات مش العمولة.

  3) "القطع المتاحة للبيع": عدد لحظي (Snapshot حالي) مش تراكمي بالفترة -
     نسبة تغيّرها محسوبة من "كم قطعة انضافت للمخزون المتاح خلال الفترة"
     مقارنة بالفترة اللي قبلها (مؤشر حقيقي على نمو المخزون المتاح، مش
     رقم وهمي).

  4) "متوسط التقييم العام للمتجر": متوسط كل التقييمات المعتمدة
     (approved) بكل المتجر (نفس فلسفة adminRating.controller.js →
     getRatingStats بالضبط) - نسبة تغيّرها من مقارنة متوسط التقييمات
     الجديدة المعتمدة بالفترة الحالية مقابل السابقة.

  5) "السلات المتروكة": الرقم الحالي = نفس رقم صفحة "السلات المتروكة"
     نفسها بالضبط (getAbandonedCartsStats مستوردة من نفس الكنترولر -
     مصدر حقيقة واحد، شوف abandonedCart.controller.js) - نسخة مبسّطة
     أخف من الحساب الكامل (بدون استبعاد السلات يلي كل بنودها غير متاحة
     حاليًا) مناسبة لكارت سريع.
*/

const REVENUE_EXCLUDED_STATUSES = ["cancelled", "returned"];
const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوم - نفس "month" بصفحة التقارير

const pctChange = (curr, prev) => {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

/*
  بيبني كارت إحصائية بشكل موحّد: { value, change, changeIsPercent }
  - changeIsPercent=true (الافتراضي): change = نسبة التغيّر المئوية
  - changeIsPercent=false: change = الفرق الخام بين القيمتين (مثلاً فرق
    نقاط التقييم "0.2" مش نسبة مئوية - هيك بالضبط التصميم الأصلي بيعرضها)
*/
const makeStat = (value, curr, prev, { isPercent = true } = {}) => ({
  value,
  change: isPercent
    ? pctChange(curr, prev)
    : Math.round((curr - prev) * 10) / 10,
  changeIsPercent: isPercent,
});

/*
  -------------------- ثابت الأعضاء المشتركين (Hardcoded مؤقتًا) --------------------
  شوف الشرح بالأعلى (نقطة 2) - القيمة هون بس عرض توضيحي لحد ما ينبنى نظام
  العضويات فعليًا بالباك إند
*/
const PLACEHOLDER_SUBSCRIBED_MEMBERS = { value: 312, changePercent: 15.0 };

/*
  نظرة عامة كاملة للوحة التحكم الرئيسية: كروت الإحصائيات العشرة +
  أحدث الطلبات + المنتجات الأكثر مشاهدة
  GET /api/admin/dashboard/overview
*/
exports.getDashboardOverview = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - ROLLING_WINDOW_MS);
    const prevStart = new Date(start.getTime() - ROLLING_WINDOW_MS);
    const prevEnd = start;

    const [
      currentOrders,
      previousOrders,
      availableProductsCount,
      availableAddedCurrent,
      availableAddedPrev,
      ratingOverallAgg,
      ratingCurrentAgg,
      ratingPrevAgg,
      newCustomersCurrent,
      newCustomersPrev,
      abandonedStats,
      affiliateSalesCurrentAgg,
      affiliateSalesPrevAgg,
      recentOrdersDocs,
      topViewedProducts,
    ] = await Promise.all([
      Order.find({
        createdAt: { $gte: start },
        status: { $nin: REVENUE_EXCLUDED_STATUSES },
      }).select("grandTotal items createdAt"),
      Order.find({
        createdAt: { $gte: prevStart, $lt: prevEnd },
        status: { $nin: REVENUE_EXCLUDED_STATUSES },
      }).select("grandTotal items createdAt"),
      Product.countDocuments({
        publishStatus: "published",
        quantity: { $gt: 0 },
      }),
      Product.countDocuments({
        publishStatus: "published",
        quantity: { $gt: 0 },
        createdAt: { $gte: start },
      }),
      Product.countDocuments({
        publishStatus: "published",
        quantity: { $gt: 0 },
        createdAt: { $gte: prevStart, $lt: prevEnd },
      }),
      Rating.aggregate([
        { $match: { approvalStatus: "approved" } },
        { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        { $match: { approvalStatus: "approved", createdAt: { $gte: start } } },
        { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        {
          $match: {
            approvalStatus: "approved",
            createdAt: { $gte: prevStart, $lt: prevEnd },
          },
        },
        { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
      ]),
      Customer.countDocuments({ createdAt: { $gte: start } }),
      Customer.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
      getAbandonedCartsStats({
        periodStart: start,
        prevPeriodStart: prevStart,
      }),
      // -------------------- مبيعات الأدمن عن طريق التسويق بالعمولة (delivered فقط - شوف الشرح بالأعلى) --------------------
      // صافي قيمة المبيعات (subtotal - couponDiscount) وليس commissionAmount
      // - هاد رقم "قد ايش باع الأدمن" مش "قد ايش قبض المسوّق"
      Order.aggregate([
        {
          $match: {
            status: "delivered",
            marketerId: { $ne: null },
            createdAt: { $gte: start },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $max: [
                  0,
                  {
                    $subtract: [
                      "$subtotal",
                      { $ifNull: ["$couponDiscount", 0] },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: "delivered",
            marketerId: { $ne: null },
            createdAt: { $gte: prevStart, $lt: prevEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $max: [
                  0,
                  {
                    $subtract: [
                      "$subtotal",
                      { $ifNull: ["$couponDiscount", 0] },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
      Order.find({})
        .populate("customerId", "fullName phone")
        .sort({ createdAt: -1 })
        .limit(6),
      Product.find({})
        .sort({ viewsCount: -1 })
        .limit(5)
        .select("name sku images viewsCount likesCount publishStatus quantity"),
    ]);

    // -------------------- المبيعات/الطلبات/متوسط الطلب/القطع المباعة --------------------
    const totalRevenue = currentOrders.reduce(
      (s, o) => s + (o.grandTotal || 0),
      0,
    );
    const prevTotalRevenue = previousOrders.reduce(
      (s, o) => s + (o.grandTotal || 0),
      0,
    );

    const ordersCount = currentOrders.length;
    const prevOrdersCount = previousOrders.length;

    const avgOrderValue = ordersCount ? totalRevenue / ordersCount : 0;
    const prevAvgOrderValue = prevOrdersCount
      ? prevTotalRevenue / prevOrdersCount
      : 0;

    const piecesSold = currentOrders.reduce(
      (s, o) => s + o.items.reduce((is, it) => is + (it.quantity || 0), 0),
      0,
    );
    const prevPiecesSold = previousOrders.reduce(
      (s, o) => s + o.items.reduce((is, it) => is + (it.quantity || 0), 0),
      0,
    );

    // -------------------- التقييم العام --------------------
    const overallRatingAvg = ratingOverallAgg[0]
      ? Math.round(ratingOverallAgg[0].avg * 10) / 10
      : 0;
    const ratingCurrentAvg = ratingCurrentAgg[0]?.avg || 0;
    const ratingPrevAvg = ratingPrevAgg[0]?.avg || 0;
    const hasRatingComparison = Boolean(
      ratingCurrentAgg[0]?.count && ratingPrevAgg[0]?.count,
    );

    // -------------------- مبيعات الأدمن عن طريق التسويق بالعمولة --------------------
    const affiliateSalesCurrent = affiliateSalesCurrentAgg[0]?.total || 0;
    const affiliateSalesPrev = affiliateSalesPrevAgg[0]?.total || 0;

    const stats = {
      piecesSold: makeStat(piecesSold, piecesSold, prevPiecesSold),
      availableProducts: makeStat(
        availableProductsCount,
        availableAddedCurrent,
        availableAddedPrev,
      ),
      avgOrderValue: makeStat(
        Math.round(avgOrderValue),
        avgOrderValue,
        prevAvgOrderValue,
      ),
      ordersCount: makeStat(ordersCount, ordersCount, prevOrdersCount),
      totalRevenue: makeStat(totalRevenue, totalRevenue, prevTotalRevenue),
      // ⚠️ التقييم: الفرق نقاط خام (مش نسبة مئوية) - شوف شرح makeStat فوق
      storeRating: makeStat(
        overallRatingAvg,
        hasRatingComparison ? ratingCurrentAvg : 0,
        hasRatingComparison ? ratingPrevAvg : 0,
        { isPercent: false },
      ),
      abandonedCarts: makeStat(
        abandonedStats.count,
        abandonedStats.enteredCurrentPeriod,
        abandonedStats.enteredPrevPeriod,
      ),
      subscribedMembers: {
        value: PLACEHOLDER_SUBSCRIBED_MEMBERS.value,
        change: PLACEHOLDER_SUBSCRIBED_MEMBERS.changePercent,
        changeIsPercent: true,
      },
      newCustomers: makeStat(
        newCustomersCurrent,
        newCustomersCurrent,
        newCustomersPrev,
      ),
      affiliateProfit: makeStat(
        affiliateSalesCurrent,
        affiliateSalesCurrent,
        affiliateSalesPrev,
      ),
    };

    // -------------------- أحدث الطلبات --------------------
    const recentOrders = recentOrdersDocs.map(serializeOrderAdminSummary);

    // -------------------- المنتجات الأكثر مشاهدة --------------------
    const productIds = topViewedProducts.map((p) => p._id);
    const cartAddsAgg =
      productIds.length > 0
        ? await Customer.aggregate([
            { $match: { "cart.productId": { $in: productIds } } },
            { $unwind: "$cart" },
            { $match: { "cart.productId": { $in: productIds } } },
            {
              $group: {
                _id: "$cart.productId",
                customerIds: { $addToSet: "$_id" },
              },
            },
          ])
        : [];
    const cartAddsByProduct = {};
    cartAddsAgg.forEach((row) => {
      cartAddsByProduct[row._id.toString()] = row.customerIds.length;
    });

    const topProducts = topViewedProducts.map((p) => ({
      id: p._id,
      name: p.name,
      sku: p.sku || null,
      image:
        p.images?.find((img) => img.isPrimary)?.url ||
        p.images?.[0]?.url ||
        null,
      viewsCount: p.viewsCount || 0,
      favoritesCount: p.likesCount || 0,
      cartAddsCount: cartAddsByProduct[p._id.toString()] || 0,
      publishStatus: p.publishStatus,
      quantity: p.quantity,
    }));

    return res.status(200).json({
      range: { from: start, to: now },
      stats,
      recentOrders,
      topProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/* ==================================================================
   رسم "أداء المبيعات" - مستقل بمساره الخاص عشان يقدر الأدمن يبدّل
   الفترة (اليوم/آخر 7 أيام/آخر 30 يوم/فترة مخصصة) بدون ما يعيد تحميل
   باقي كروت الصفحة كل مرة
   ================================================================== */

const AR_WEEKDAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const formatHourLabel = (hour) => {
  const suffix = hour < 12 ? "ص" : "م";
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h}${suffix}`;
};

const formatDayLabel = (date, period) => {
  if (period === "week") return AR_WEEKDAYS[date.getDay()];
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

/*
  بيبني حدود النافذة الحالية + السابقة (بنفس الطول) + تعريف الـ Buckets
  (حجم كل شريحة زمنية بالمللي ثانية + عددها) حسب الفترة المختارة - نفس
  فلسفة "نافذة متدحرجة بطول ثابت" المستخدمة بصفحة التقارير بالضبط
*/
const resolveSalesWindow = (period, from, to) => {
  const now = new Date();

  if (period === "custom" && from && to) {
    const currentStart = new Date(from);
    currentStart.setHours(0, 0, 0, 0);
    const currentEnd = new Date(to);
    currentEnd.setHours(0, 0, 0, 0);
    currentEnd.setDate(currentEnd.getDate() + 1); // نهاية اليوم الأخير (exclusive)

    const durationMs = Math.max(
      24 * 60 * 60 * 1000,
      currentEnd.getTime() - currentStart.getTime(),
    );
    const bucketMs = 24 * 60 * 60 * 1000;
    const bucketCount = Math.min(60, Math.round(durationMs / bucketMs));

    const prevEnd = currentStart;
    const prevStart = new Date(currentStart.getTime() - bucketCount * bucketMs);

    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      bucketMs,
      bucketCount,
    };
  }

  if (period === "thisMonth") {
    const bucketMs = 24 * 60 * 60 * 1000;

    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentStart.setHours(0, 0, 0, 0);
    const currentEnd = new Date(now);
    currentEnd.setHours(0, 0, 0, 0);
    currentEnd.setDate(currentEnd.getDate() + 1); // نهاية اليوم الحالي (exclusive)

    const bucketCount = Math.max(
      1,
      Math.round((currentEnd.getTime() - currentStart.getTime()) / bucketMs),
    );

    const prevEnd = currentStart;
    const prevStart = new Date(prevEnd.getTime() - bucketCount * bucketMs);

    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      bucketMs,
      bucketCount,
    };
  }

  if (period === "week" || period === "month") {
    const bucketCount = period === "week" ? 7 : 30;
    const bucketMs = 24 * 60 * 60 * 1000;

    const currentEnd = new Date(now);
    currentEnd.setHours(0, 0, 0, 0);
    currentEnd.setDate(currentEnd.getDate() + 1); // نهاية اليوم الحالي (exclusive)
    const currentStart = new Date(
      currentEnd.getTime() - bucketCount * bucketMs,
    );

    const prevEnd = currentStart;
    const prevStart = new Date(prevEnd.getTime() - bucketCount * bucketMs);

    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      bucketMs,
      bucketCount,
    };
  }

  // period === "today" (الافتراضي) - شرائح كل ساعتين على مدار اليوم كامل
  const bucketMs = 2 * 60 * 60 * 1000;
  const bucketCount = 12;

  const currentStart = new Date(now);
  currentStart.setHours(0, 0, 0, 0);
  const currentEnd = new Date(currentStart.getTime() + 24 * 60 * 60 * 1000);

  const prevStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
  const prevEnd = currentStart;

  return {
    currentStart,
    currentEnd,
    prevStart,
    prevEnd,
    bucketMs,
    bucketCount,
  };
};

/*
  بيانات رسم "أداء المبيعات" (الفترة الحالية مقابل السابقة، بنفس عدد
  النقاط ونفس الطول الزمني بالضبط) - القيم إجمالي المبيعات (grandTotal)
  لكل شريحة زمنية، بعد استبعاد الطلبات الملغاة/المرتجعة (نفس فلسفة كل
  حسابات الإيرادات بالنظام)
  GET /api/admin/dashboard/sales-performance?period=today|week|month|thisMonth|custom&from=&to=
*/
exports.getSalesPerformance = async (req, res) => {
  try {
    const { period = "today", from, to } = req.query;
    const validPeriods = ["today", "week", "month", "thisMonth", "custom"];
    const safePeriod = validPeriods.includes(period) ? period : "today";

    const {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      bucketMs,
      bucketCount,
    } = resolveSalesWindow(safePeriod, from, to);

    const orders = await Order.find({
      createdAt: { $gte: prevStart, $lt: currentEnd },
      status: { $nin: REVENUE_EXCLUDED_STATUSES },
    }).select("grandTotal createdAt");

    const current = new Array(bucketCount).fill(0);
    const previous = new Array(bucketCount).fill(0);

    orders.forEach((order) => {
      const t = new Date(order.createdAt).getTime();
      if (t >= currentStart.getTime() && t < currentEnd.getTime()) {
        const idx = Math.min(
          bucketCount - 1,
          Math.floor((t - currentStart.getTime()) / bucketMs),
        );
        current[idx] += order.grandTotal || 0;
      } else if (t >= prevStart.getTime() && t < prevEnd.getTime()) {
        const idx = Math.min(
          bucketCount - 1,
          Math.floor((t - prevStart.getTime()) / bucketMs),
        );
        previous[idx] += order.grandTotal || 0;
      }
    });

    const labels = [];
    for (let i = 0; i < bucketCount; i += 1) {
      const bucketDate = new Date(currentStart.getTime() + i * bucketMs);
      labels.push(
        safePeriod === "today"
          ? formatHourLabel(bucketDate.getHours())
          : formatDayLabel(bucketDate, safePeriod),
      );
    }

    return res.status(200).json({
      period: safePeriod,
      range: { from: currentStart, to: currentEnd },
      labels,
      current,
      previous,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

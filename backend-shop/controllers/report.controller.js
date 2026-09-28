const Order = require("../models/order");
const Customer = require("../models/customer");
const Product = require("../models/product");
const Category = require("../models/category");

/*
  report.controller.js
  ------------------------------------------------------------------
  صفحة "التقارير والتحليلات" بلوحة تحكم الأدمن - كل الأرقام هون محسوبة
  لحظيًا وقت كل طلب (مفيش أي تخزين وسيط)، نفس فلسفة باقي النظام تمامًا

  -------------------- الفترة الزمنية --------------------
  بدل ما نعتمد على حدود شهر/أسبوع تقويمية (يلي بتفتح باب مقارنات مش
  عادلة زي مقارنة نص شهر حالي بشهر سابق كامل)، بنعتمد على "نوافذ زمنية
  متدحرجة" (Rolling Window) بطول ثابت - نفس المبدأ المستخدم أصلاً بـ
  adminOrder.controller.js/getOrderStats (weekAgo = now - 7 أيام). مثلاً
  "هذا الشهر" = آخر 30 يوم من لحظة الطلب، ومقارنتها بالـ30 يوم اللي قبلها
  مباشرة - نفس طول الفترة بالضبط، فالمقارنة عادلة دائمًا

  -------------------- الطلبات المحتسبة بالإيرادات --------------------
  بنستبعد الطلبات "الملغاة" و"المرتجعة" من كل حسابات الإيرادات/المتوسط/
  عدد الطلبيات - لأنها لم تتحول لبيع فعلي نهائي (نفس فلسفة استبعاد
  المرتجع/الملغي من أي تقرير مبيعات حقيقي)

  -------------------- نمو المبيعات (آخر 6 شهور) --------------------
  ⚠️ هاد الرسم البياني وحده مستقل عن فلتر الفترة المختار فوق - دايمًا
  بيعرض اتجاه آخر 6 شهور كاملة (Trend) بغض النظر عن الفترة المختارة،
  لأنه مفهوم "النمو" أصلاً بيحتاج نافذة زمنية أوسع تظهر فيها القفزات/
  الانخفاضات - فترة "اليوم" مثلاً ما بتعطي رسم بياني مفيد لهيك الغرض
*/

const REVENUE_EXCLUDED_STATUSES = ["cancelled", "returned"];

const PERIOD_DURATIONS_MS = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  quarter: 90 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/*
  بيرجع حدود الفترة الحالية + الفترة السابقة المكافئة لها بنفس الطول
  بالضبط (شوف شرح الملف فوق)
*/
const resolveRange = (period, from, to) => {
  const now = new Date();

  if (period === "custom" && from && to) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const duration = Math.max(1, end.getTime() - start.getTime());
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - duration);

    return { start, end, prevStart, prevEnd };
  }

  const duration = PERIOD_DURATIONS_MS[period] || PERIOD_DURATIONS_MS.month;
  const end = now;
  const start = new Date(now.getTime() - duration);
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - duration);

  return { start, end, prevStart, prevEnd };
};

const pctChange = (curr, prev) => {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

/*
  إحصائيات إجمالية بسيطة (عدد الطلبات + الإيرادات) لفترة معينة - مستخدمة
  للفترة الحالية والسابقة سوا، بنفس الشرط بالضبط
*/
const getPeriodTotals = async (start, end) => {
  const orders = await Order.find({
    createdAt: { $gte: start, $lt: end },
    status: { $nin: REVENUE_EXCLUDED_STATUSES },
  }).select("grandTotal customerId items createdAt");

  const ordersCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  return { orders, ordersCount, totalRevenue };
};

/*
  بيلف على الفئات الفرعية ويرجع اسم الفئة الرئيسية (المستوى الأعلى) -
  لو المنتج تابع لقسم رئيسي مباشرة بيرجع اسمه هو نفسه، ولو مالوش فئة
  أصلاً (أو المنتج محذوف) بيرجع "غير مصنف"
*/
const buildTopCategoryResolver = async () => {
  const categories = await Category.find({}).select("name parentId");
  const byId = {};
  categories.forEach((c) => {
    byId[c._id.toString()] = { name: c.name, parentId: c.parentId };
  });

  return (categoryId) => {
    if (!categoryId) return "غير مصنف";
    let current = byId[categoryId.toString()];
    if (!current) return "غير مصنف";
    while (current.parentId && byId[current.parentId.toString()]) {
      current = byId[current.parentId.toString()];
    }
    return current.name;
  };
};

/*
  نظرة عامة كاملة لصفحة التقارير - كروت الإحصائيات + توزيع المبيعات حسب
  الفئة + أفضل العملاء + المنتجات الأكثر مبيعًا (كلهم حسب الفترة
  المختارة)، بالإضافة لرسم "نمو المبيعات" المستقل (آخر 6 شهور دائمًا)
  GET /api/admin/reports/overview?period=month&from=&to=
*/
exports.getReportsOverview = async (req, res) => {
  try {
    const { period = "month", from, to } = req.query;
    const { start, end, prevStart, prevEnd } = resolveRange(period, from, to);

    const [current, previous, newCustomers, prevNewCustomers] =
      await Promise.all([
        getPeriodTotals(start, end),
        getPeriodTotals(prevStart, prevEnd),
        Customer.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Customer.countDocuments({
          createdAt: { $gte: prevStart, $lt: prevEnd },
        }),
      ]);

    const avgOrderValue = current.ordersCount
      ? current.totalRevenue / current.ordersCount
      : 0;
    const prevAvgOrderValue = previous.ordersCount
      ? previous.totalRevenue / previous.ordersCount
      : 0;

    const stats = {
      avgOrderValue: {
        value: Math.round(avgOrderValue),
        changePercent: pctChange(avgOrderValue, prevAvgOrderValue),
      },
      newCustomers: {
        value: newCustomers,
        changePercent: pctChange(newCustomers, prevNewCustomers),
      },
      ordersCount: {
        value: current.ordersCount,
        changePercent: pctChange(current.ordersCount, previous.ordersCount),
      },
      totalRevenue: {
        value: current.totalRevenue,
        changePercent: pctChange(current.totalRevenue, previous.totalRevenue),
      },
    };

    // -------------------- توزيع المبيعات حسب الفئة + المنتجات الأكثر مبيعًا --------------------
    const productAgg = {}; // productId -> { name, image, quantity, revenue }
    current.orders.forEach((order) => {
      order.items.forEach((item) => {
        const pid = item.productId?.toString();
        if (!pid) return;
        if (!productAgg[pid]) {
          productAgg[pid] = {
            name: item.name,
            image: item.image,
            quantity: 0,
            revenue: 0,
          };
        }
        productAgg[pid].quantity += item.quantity;
        productAgg[pid].revenue += item.lineTotal;
      });
    });

    const productIds = Object.keys(productAgg);
    const products = await Product.find({
      _id: { $in: productIds },
    }).select("categoryId");
    const categoryIdByProduct = {};
    products.forEach((p) => {
      categoryIdByProduct[p._id.toString()] = p.categoryId;
    });

    const resolveTopCategory = await buildTopCategoryResolver();

    const categoryRevenue = {};
    productIds.forEach((pid) => {
      const categoryName = resolveTopCategory(categoryIdByProduct[pid]);
      categoryRevenue[categoryName] =
        (categoryRevenue[categoryName] || 0) + productAgg[pid].revenue;
    });

    const totalCategoryRevenue = Object.values(categoryRevenue).reduce(
      (sum, v) => sum + v,
      0,
    );

    const salesByCategory = Object.entries(categoryRevenue)
      .map(([name, revenue]) => ({
        name,
        revenue,
        percent:
          totalCategoryRevenue > 0
            ? Math.round((revenue / totalCategoryRevenue) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts = Object.entries(productAgg)
      .map(([id, p]) => ({
        id,
        name: p.name,
        image: p.image,
        quantitySold: p.quantity,
        revenue: p.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // -------------------- أفضل العملاء --------------------
    const customerAgg = {}; // customerId -> { totalSpent, ordersCount }
    current.orders.forEach((order) => {
      const cid = order.customerId?.toString();
      if (!cid) return;
      if (!customerAgg[cid]) {
        customerAgg[cid] = { totalSpent: 0, ordersCount: 0 };
      }
      customerAgg[cid].totalSpent += order.grandTotal || 0;
      customerAgg[cid].ordersCount += 1;
    });

    const topCustomerIds = Object.entries(customerAgg)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 5)
      .map(([id]) => id);

    const topCustomerDocs = await Customer.find({
      _id: { $in: topCustomerIds },
    }).select("fullName phone");
    const customerById = {};
    topCustomerDocs.forEach((c) => (customerById[c._id.toString()] = c));

    const topCustomers = topCustomerIds
      .map((id) => ({
        id,
        fullName: customerById[id]?.fullName || "زبون محذوف",
        phone: customerById[id]?.phone || "",
        totalSpent: customerAgg[id].totalSpent,
        ordersCount: customerAgg[id].ordersCount,
      }))
      .filter(Boolean);

    // -------------------- نمو المبيعات (آخر 6 شهور - مستقل عن الفترة) --------------------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const growthOrders = await Order.find({
      createdAt: { $gte: sixMonthsAgo },
      status: { $nin: REVENUE_EXCLUDED_STATUSES },
    }).select("grandTotal createdAt");

    const monthBuckets = [];
    for (let i = 0; i < 6; i += 1) {
      const bucketDate = new Date(sixMonthsAgo);
      bucketDate.setMonth(sixMonthsAgo.getMonth() + i);
      monthBuckets.push({
        key: `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`,
        label: AR_MONTHS[bucketDate.getMonth()],
        value: 0,
      });
    }
    const bucketByKey = {};
    monthBuckets.forEach((b) => (bucketByKey[b.key] = b));

    growthOrders.forEach((order) => {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (bucketByKey[key]) {
        bucketByKey[key].value += order.grandTotal || 0;
      }
    });

    const salesGrowth = monthBuckets.map(({ label, value }) => ({
      label,
      value,
    }));

    return res.status(200).json({
      range: { from: start, to: end },
      stats,
      salesByCategory,
      salesGrowth,
      topCustomers,
      topProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

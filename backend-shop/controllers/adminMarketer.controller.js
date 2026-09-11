const mongoose = require("mongoose");
const Customer = require("../models/customer");
const Order = require("../models/order");
const { STATUS_LABELS } = require("../utils/serializeOrder");

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
  adminMarketer.controller.js
  ------------------------------------------------------------------
  إدارة "التسويق بالعمولة" من لوحة تحكم الأدمن - المسوّق هو نفسه حساب
  Customer عادي معلَّم بحقل marketer.isMarketer (شوف شرح الموديل كامل
  بموديل customer.js) - ما في تعيين إلا لزبون مسجَّل فعليًا (بحث بالاسم/
  الهاتف، نفس بنية اختيار زبائن الكوبون الخاص بالضبط - customer-options)

  ⚠️ إجمالي المبيعات وإجمالي العمولة (بكل مكان بهذا الملف) بيُحسبان
  لحظيًا فقط من الطلبات بحالة "delivered" - نفس القاعدة المستخدمة بالضبط
  لـ totalSpent بعميل VIP (adminCustomer.controller.js). أي طلب لسه قيد
  التنفيذ أو انلغى أو ارتجع ما بيدخل هالحساب أبدًا، حماية لحق الأدمن لحد
  ما يتأكد فعليًا إنه الطلب وصل وانباع - بدون أي علم "تأكيد/إلغاء" إضافي
  مخزّن، بنفس فلسفة "بدون Snapshot" المتبعة بكل النظام
*/
const DELIVERED_MATCH = { status: "delivered" };

/*
  خيارات مختصرة لزبائن غير مسوّقين بعد، للبحث عنهم وقت تعيين مسوّق جديد
  (بالاسم أو الهاتف) - نفس فلسفة getCustomerOptions بـ coupon.controller.js
  بالضبط، بس هون بنستثني الزبائن يلي أصلاً مسوّقين (ما فيه داعي يظهروا
  بنتيجة البحث لأنه تعيينهم مرة تانية غير منطقي - التعديل عليهم بيصير من
  صفحة تفاصيل المسوّق نفسها مش من فورم "إضافة")
  GET /api/admin/marketers/customer-options?search=...
*/
exports.getCustomerOptions = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = { "marketer.isMarketer": { $ne: true } };
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      filter.$or = [{ fullName: regex }, { phone: regex }];
    }

    const customers = await Customer.find(filter)
      .select("fullName phone email")
      .limit(30)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      customers: customers.map((c) => ({
        id: c._id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email || "",
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إحصائيات صفحة "المسوّقين": إجمالي المسوّقين، عدد النشطين، إجمالي
  المبيعات وإجمالي العمولة (طلبات "تم التسليم" بس - شوف الشرح فوق)
  GET /api/admin/marketers/stats
*/
exports.getMarketerStats = async (req, res) => {
  try {
    const [totalMarketers, activeMarketers, orderAgg] = await Promise.all([
      Customer.countDocuments({ "marketer.isMarketer": true }),
      Customer.countDocuments({
        "marketer.isMarketer": true,
        "marketer.status": "active",
      }),
      Order.aggregate([
        { $match: { marketerId: { $ne: null }, ...DELIVERED_MATCH } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalCommission: { $sum: "$commissionAmount" },
          },
        },
      ]),
    ]);

    const totals = orderAgg[0] || { totalSales: 0, totalCommission: 0 };

    return res.status(200).json({
      stats: {
        totalMarketers,
        activeMarketers,
        totalSales: totals.totalSales,
        totalCommission: totals.totalCommission,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  قائمة المسوّقين - بحث (اسم/هاتف/إيميل) + فلترة بالحالة + تقسيم صفحات.
  بتجمع لكل مسوّق: عدد مبيعاته وإجمالي عمولته (طلبات "delivered" بس) -
  نفس أسلوب $lookup المستخدم بـ getCustomers (adminCustomer.controller.js)
  GET /api/admin/marketers
*/
exports.getMarketers = async (req, res) => {
  try {
    const {
      search,
      status = "all",
      sort = "newest",
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));

    const matchStage = { "marketer.isMarketer": true };
    if (status === "active" || status === "paused") {
      matchStage["marketer.status"] = status;
    }
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      matchStage.$or = [
        { fullName: regex },
        { phone: regex },
        { email: regex },
        { "marketer.code": regex },
      ];
    }

    const sortStageMap = {
      newest: { "marketer.assignedAt": -1 },
      oldest: { "marketer.assignedAt": 1 },
      most_sales: { salesCount: -1 },
      most_commission: { totalCommission: -1 },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "orders",
          let: { marketerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$marketerId", "$$marketerId"] },
                status: "delivered",
              },
            },
          ],
          as: "deliveredOrders",
        },
      },
      {
        $addFields: {
          salesCount: { $size: "$deliveredOrders" },
          totalCommission: { $sum: "$deliveredOrders.commissionAmount" },
        },
      },
      {
        $facet: {
          data: [
            { $sort: sortStageMap[sort] || sortStageMap.newest },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
            {
              $project: {
                fullName: 1,
                email: 1,
                phone: 1,
                marketer: 1,
                salesCount: 1,
                totalCommission: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Customer.aggregate(pipeline);
    const total = result.totalCount[0]?.count || 0;

    const marketers = result.data.map((c) => ({
      id: c._id,
      fullName: c.fullName,
      email: c.email || "",
      phone: c.phone,
      code: c.marketer.code,
      commissionPercentage: c.marketer.commissionPercentage,
      status: c.marketer.status,
      assignedAt: c.marketer.assignedAt,
      salesCount: c.salesCount,
      totalCommission: c.totalCommission,
    }));

    return res.status(200).json({
      marketers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعيين زبون مسجَّل فعليًا كمسوّق جديد - customerId من نتيجة بحث
  customer-options فوق، code يُدخله الأدمن يدويًا بالكامل (فريد -
  الفهرس على الموديل بيرفض التكرار، بس منتحقق هون مسبقًا لرسالة خطأ
  واضحة بدل ما يوصل الخطأ خام من MongoDB)
  POST /api/admin/marketers   body: { customerId, code, commissionPercentage }
*/
exports.assignMarketer = async (req, res) => {
  try {
    const { customerId, code, commissionPercentage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "معرّف زبون غير صالح" });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ message: "رمز الإحالة مطلوب" });
    }
    const commission = Number(commissionPercentage);
    if (!commission || commission <= 0 || commission > 100) {
      return res
        .status(400)
        .json({ message: "نسبة العمولة يجب أن تكون بين 1 و100" });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "الزبون غير موجود" });
    }
    if (customer.marketer?.isMarketer) {
      return res.status(409).json({ message: "هذا الزبون مسوّق أصلاً" });
    }

    const normalizedCode = code.trim().toUpperCase();
    const codeTaken = await Customer.findOne({
      "marketer.code": normalizedCode,
    });
    if (codeTaken) {
      return res
        .status(409)
        .json({ message: "رمز الإحالة هذا مستخدم أصلاً لمسوّق آخر" });
    }

    customer.marketer = {
      isMarketer: true,
      code: normalizedCode,
      commissionPercentage: commission,
      status: "active",
      assignedAt: new Date(),
    };
    await customer.save();

    return res.status(201).json({
      message: "تم تعيين المسوّق بنجاح",
      marketer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email || "",
        phone: customer.phone,
        code: customer.marketer.code,
        commissionPercentage: customer.marketer.commissionPercentage,
        status: customer.marketer.status,
        assignedAt: customer.marketer.assignedAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "رمز الإحالة هذا مستخدم أصلاً لمسوّق آخر" });
    }
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  ملف مسوّق كامل (لصفحة تفاصيل المسوّق) - بياناته + إحصائياته (طلبات
  "delivered" بس) + رسم المبيعات الشهري (آخر 6 شهور، نفس أسلوب
  report.controller.js/salesGrowth بالضبط) + آخر 10 طلبات جاءت عن طريقه
  (بكل الحالات - للشفافية، بس الإجمالي بالأعلى بيضل يحسب "delivered" فقط)
  GET /api/admin/marketers/:id
*/
exports.getMarketerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف مسوّق غير صالح" });
    }

    const customer = await Customer.findOne({
      _id: id,
      "marketer.isMarketer": true,
    }).select("fullName email phone marketer createdAt");

    if (!customer) {
      return res.status(404).json({ message: "المسوّق غير موجود" });
    }

    const [deliveredOrders, recentOrders] = await Promise.all([
      Order.find({ marketerId: id, status: "delivered" }).select(
        "commissionAmount createdAt",
      ),
      Order.find({ marketerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("orderNumber status grandTotal commissionAmount createdAt"),
    ]);

    const totalSales = deliveredOrders.length;
    const totalCommission = deliveredOrders.reduce(
      (sum, o) => sum + (o.commissionAmount || 0),
      0,
    );

    // -------------------- رسم المبيعات الشهرية (آخر 6 شهور) --------------------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

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

    deliveredOrders
      .filter((o) => o.createdAt >= sixMonthsAgo)
      .forEach((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (bucketByKey[key]) bucketByKey[key].value += 1; // عدد عمليات البيع بالشهر
      });

    const monthlySales = monthBuckets.map(({ label, value }) => ({
      label,
      value,
    }));

    return res.status(200).json({
      marketer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email || "",
        phone: customer.phone,
        code: customer.marketer.code,
        commissionPercentage: customer.marketer.commissionPercentage,
        status: customer.marketer.status,
        assignedAt: customer.marketer.assignedAt,
        totalSales,
        totalCommission,
      },
      monthlySales,
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: STATUS_LABELS[o.status] || o.status,
        grandTotal: o.grandTotal,
        commissionAmount: o.commissionAmount || 0,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل بيانات مسوّق - الرمز/نسبة العمولة/الحالة (نشط ↔ معلَّق). أي طلب
  قديم استخدم الرمز أو النسبة القديمة يضل يعرض Snapshot وقتها بدون أي
  تغيير - التعديل هون بيأثر فقط على الطلبات الجديدة من هون وصاعدًا
  PATCH /api/admin/marketers/:id   body: { code?, commissionPercentage?, status? }
*/
exports.updateMarketer = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, commissionPercentage, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف مسوّق غير صالح" });
    }

    const customer = await Customer.findOne({
      _id: id,
      "marketer.isMarketer": true,
    });
    if (!customer) {
      return res.status(404).json({ message: "المسوّق غير موجود" });
    }

    if (typeof code === "string" && code.trim()) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== customer.marketer.code) {
        const codeTaken = await Customer.findOne({
          _id: { $ne: id },
          "marketer.code": normalizedCode,
        });
        if (codeTaken) {
          return res
            .status(409)
            .json({ message: "رمز الإحالة هذا مستخدم أصلاً لمسوّق آخر" });
        }
        customer.marketer.code = normalizedCode;
      }
    }

    if (commissionPercentage !== undefined) {
      const commission = Number(commissionPercentage);
      if (!commission || commission <= 0 || commission > 100) {
        return res
          .status(400)
          .json({ message: "نسبة العمولة يجب أن تكون بين 1 و100" });
      }
      customer.marketer.commissionPercentage = commission;
    }

    if (status && ["active", "paused"].includes(status)) {
      customer.marketer.status = status;
    }

    await customer.save();

    return res.status(200).json({
      message: "تم تحديث بيانات المسوّق بنجاح",
      marketer: {
        id: customer._id,
        code: customer.marketer.code,
        commissionPercentage: customer.marketer.commissionPercentage,
        status: customer.marketer.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "رمز الإحالة هذا مستخدم أصلاً لمسوّق آخر" });
    }
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إلغاء تعيين مسوّق - حسابه العادي (طلباته، مفضلته...) يضل زي ما هو
  تمامًا، وبس بيرجع زبون عادي (بيختفي عنده قسم "لوحة المسوّق" بالمتجر
  تلقائيًا). الطلبات القديمة يلي جابها ما بتتأثر أبدًا - marketerName/
  marketerCode/commissionPercentage/commissionAmount المخزّنة عليها
  Snapshot ثابت، بتضل تعرض صح بلوحة الأدمن حتى بعد إلغاء التعيين
  DELETE /api/admin/marketers/:id
*/
exports.unassignMarketer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف مسوّق غير صالح" });
    }

    const customer = await Customer.findOne({
      _id: id,
      "marketer.isMarketer": true,
    });
    if (!customer) {
      return res.status(404).json({ message: "المسوّق غير موجود" });
    }

    customer.marketer = {
      isMarketer: false,
      code: null,
      commissionPercentage: 10,
      status: "active",
      assignedAt: null,
    };
    await customer.save();

    return res.status(200).json({ message: "تم إلغاء تعيين المسوّق" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

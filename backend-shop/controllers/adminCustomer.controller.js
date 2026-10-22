const mongoose = require("mongoose");
const Customer = require("../models/customer");
const Order = require("../models/order");
const Rating = require("../models/rating");

/*
  adminCustomer.controller.js
  ------------------------------------------------------------------
  إدارة العملاء (المستخدمين) من لوحة تحكم الأدمن - قراءة + تعليق/تفعيل
  حساب فقط (بدون حذف نهائي، لأنه موديل Order فيه مرجع customerId ثابت
  لازم يضل صحيح دايمًا لأي طلب قديم - نفس فلسفة عدم حذف الفئات المرتبطة
  بمحتوى بدون نقله أولًا)

  ⚠️ موديل Customer نفسه ما فيه حقل "مدينة" مباشر (بس فيه هاتف/بريد/اسم)
  - المدينة المعروضة هون بتيجي من عنوان آخر طلب للزبون (shipping.city)،
  ولو ما عندوش أي طلب لسه بترجع "—"

  ⚠️ "عميل VIP" مش حقل مخزّن بالداتابيز - محسوب لحظيًا حسب حد أدنى
  لإجمالي الإنفاق أو عدد الطلبات (نفس فلسفة "بدون Snapshot" المتبعة بكل
  النظام - applyOffers.js/couponEngine.js) عشان يتحدّث تلقائيًا مع كل
  طلب جديد بدون أي عملية صيانة يدوية
*/
const VIP_MIN_SPENT = 3000000; // ل.س - إجمالي إنفاق (طلبات "تم التسليم" بس) كافي لاعتبار الزبون VIP
const VIP_MIN_ORDERS = 8; // أو عدد طلبات (أي حالة) كافي لوحده لاعتباره VIP

/*
  إحصائيات صفحة العملاء: إجمالي العملاء، إجمالي الطلبات، عدد عملاء VIP،
  إجمالي الإنفاق (من الطلبات "تم التسليم" بس - المبلغ الفعلي المقبوض،
  مش أي طلب لسه قيد التنفيذ أو انلغى/ارتجع)
  GET /api/admin/customers/stats
*/
exports.getCustomerStats = async (req, res) => {
  try {
    const [totalCustomers, orderAgg] = await Promise.all([
      Customer.countDocuments({}),
      Order.aggregate([
        {
          $group: {
            _id: "$customerId",
            ordersCount: { $sum: 1 },
            totalSpent: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, "$grandTotal", 0],
              },
            },
          },
        },
      ]),
    ]);

    let totalOrders = 0;
    let totalSpent = 0;
    let vipCustomers = 0;

    orderAgg.forEach((c) => {
      totalOrders += c.ordersCount;
      totalSpent += c.totalSpent;
      if (c.totalSpent >= VIP_MIN_SPENT || c.ordersCount >= VIP_MIN_ORDERS) {
        vipCustomers += 1;
      }
    });

    return res.status(200).json({
      stats: { totalCustomers, totalOrders, vipCustomers, totalSpent },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  قائمة العملاء - فلترة بالحالة (active/suspended/vip) + بحث (اسم/هاتف/
  بريد) + ترتيب + تقسيم صفحات. بتجمع لكل زبون: عدد طلباته، إجمالي إنفاقه
  (طلبات "تم التسليم" بس)، ومدينة آخر طلب - كل هذا بعملية aggregate
  وحدة (join مع Orders) بدل استعلام منفصل لكل زبون
  GET /api/admin/customers
*/
exports.getCustomers = async (req, res) => {
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

    const matchStage = {};
    if (status === "active" || status === "suspended") {
      matchStage.status = status;
    }
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      matchStage.$or = [
        { fullName: regex },
        { phone: regex },
        { email: regex },
      ];
    }

    const sortStageMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      most_orders: { ordersCount: -1 },
      most_spent: { totalSpent: -1 },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "customerId",
          as: "orders",
        },
      },
      {
        $addFields: {
          ordersCount: { $size: "$orders" },
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$orders",
                    as: "o",
                    cond: { $eq: ["$$o.status", "delivered"] },
                  },
                },
                as: "d",
                in: "$$d.grandTotal",
              },
            },
          },
          lastOrderCity: { $arrayElemAt: ["$orders.shipping.city", -1] },
        },
      },
    ];

    if (status === "vip") {
      pipeline.push({
        $match: {
          $or: [
            { totalSpent: { $gte: VIP_MIN_SPENT } },
            { ordersCount: { $gte: VIP_MIN_ORDERS } },
          ],
        },
      });
    }

    pipeline.push({
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
              status: 1,
              createdAt: 1,
              ordersCount: 1,
              totalSpent: 1,
              lastOrderCity: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const [result] = await Customer.aggregate(pipeline);
    const total = result.totalCount[0]?.count || 0;

    const customers = result.data.map((c) => ({
      id: c._id,
      fullName: c.fullName,
      email: c.email || "",
      phone: c.phone,
      status: c.status,
      city: c.lastOrderCity || "—",
      ordersCount: c.ordersCount,
      totalSpent: c.totalSpent,
      isVip: c.totalSpent >= VIP_MIN_SPENT || c.ordersCount >= VIP_MIN_ORDERS,
      createdAt: c.createdAt,
    }));

    return res.status(200).json({
      customers,
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
  ملف زبون كامل (لنافذة "عرض الملف") - بياناته + إحصائياته + آخر 10 طلبات
  GET /api/admin/customers/:id
*/
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف زبون غير صالح" });
    }

    const customer = await Customer.findById(id).select(
      "fullName email phone status favorites createdAt",
    );
    if (!customer) {
      return res.status(404).json({ message: "الزبون غير موجود" });
    }

    const [allOrders, recentOrders, ratingsCount] = await Promise.all([
      Order.find({ customerId: id }).select("status grandTotal"),
      Order.find({ customerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("orderNumber status grandTotal items createdAt"),
      Rating.countDocuments({ customerId: id }),
    ]);

    const ordersCount = allOrders.length;
    const totalSpent = allOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + o.grandTotal, 0);
    const isVip = totalSpent >= VIP_MIN_SPENT || ordersCount >= VIP_MIN_ORDERS;

    return res.status(200).json({
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email || "",
        phone: customer.phone,
        status: customer.status,
        favoritesCount: customer.favorites?.length || 0,
        ratingsCount,
        ordersCount,
        totalSpent,
        isVip,
        createdAt: customer.createdAt,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        itemsCount: o.items.length,
        grandTotal: o.grandTotal,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعليق/إعادة تفعيل حساب زبون - الحساب المعلّق ما بيقدر صاحبه يسجّل
  دخول (شوف customer.controller.js → loginCustomer، الشرط موجود أصلاً)
  PATCH /api/admin/customers/:id/status   body: { status: "active" | "suspended" }
*/
exports.updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف زبون غير صالح" });
    }
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    );

    if (!customer) {
      return res.status(404).json({ message: "الزبون غير موجود" });
    }

    return res.status(200).json({
      message:
        status === "suspended"
          ? "تم تعليق حساب الزبون"
          : "تم إعادة تفعيل حساب الزبون",
      status: customer.status,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

const mongoose = require("mongoose");
const Order = require("../models/order");
const Customer = require("../models/customer");
const {
  ORDER_STATUS_VALUES,
  RESTOCK_STATUSES,
  canTransition,
  restockOrderItems,
} = require("../utils/orderStatusEngine");
const {
  STATUS_LABELS,
  serializeOrderAdminSummary,
  serializeOrderAdminDetail,
} = require("../utils/serializeOrder");
const { createNotification } = require("../utils/notificationEngine");

/*
  adminOrder.controller.js
  ------------------------------------------------------------------
  إدارة الطلبات من لوحة تحكم الأدمن - منفصل كليًا عن order.controller.js
  (يلي هو خاص بواجهة الزبون: إنشاء طلب من السلة + تصفح طلباته الشخصية
  بس). هون الأدمن بيقدر يشوف/يفلتر/يبحث بكل الطلبات لكل الزبائن، ويغيّر
  حالة أي طلب، ويسجّل ملاحظة داخلية عليه، مع إرجاع تلقائي للمخزون لحظة
  الإلغاء أو الإرجاع (utils/orderStatusEngine.js)

  ⚠️ إضافة: كل انتقال حالة فعلي (statusChanged=true) بيبعت تلقائيًا إشعار
  للزبون صاحب الطلب (utils/notificationEngine.js) - نفس فكرة "طلبك في
  الشحن" اللي بتظهر بصفحة الإشعارات عند الزبون. "pending" مش موجودة
  بالخريطة تحت لأنها الحالة الافتراضية عند الإنشاء (ما في انتقال فعلي
  ليها لأي طلب أصلًا). فشل إرسال الإشعار (لو صار لأي سبب) ما بيوقف تحديث
  حالة الطلب نفسه أبدًا - الطلب أهم، والإشعار تحسين إضافي بس
*/

const ORDER_NOTIFICATION_TEMPLATES = {
  confirmed: {
    title: "✅ تم تأكيد طلبك",
    message: (orderNumber) =>
      `طلبك رقم ${orderNumber} تم تأكيده، وجاري تجهيزه قريبًا`,
  },
  processing: {
    title: "📦 طلبك قيد التجهيز",
    message: (orderNumber) => `طلبك رقم ${orderNumber} قيد التجهيز حاليًا`,
  },
  shipped: {
    title: "🚚 طلبك في الطريق إليك",
    message: (orderNumber) => `طلبك رقم ${orderNumber} تم شحنه، وبيوصلك قريبًا`,
  },
  delivered: {
    title: "🎉 تم توصيل طلبك",
    message: (orderNumber) =>
      `طلبك رقم ${orderNumber} وصلك بنجاح - نتمنى إنه عجبك اختيارك!`,
  },
  cancelled: {
    title: "❌ تم إلغاء طلبك",
    message: (orderNumber) => `طلبك رقم ${orderNumber} تم إلغاؤه`,
  },
  returned: {
    title: "↩️ تم استلام إرجاع طلبك",
    message: (orderNumber) => `طلبك رقم ${orderNumber} اتسجّل كمرتجع بنجاح`,
  },
};

/*
  إحصائيات صفحة الطلبات: العدد الحالي لكل حالة + "التغيّر هذا الأسبوع"
  لكل حالة (عدد الطلبات يلي دخلت هاي الحالة خلال آخر 7 أيام مقابل الـ7
  أيام يلي قبلها - فرق حقيقي محسوب من سجل statusHistory الفعلي، مش رقم
  وهمي) + نسبة نمو إجمالي الطلبات هذا الأسبوع
  GET /api/admin/orders/stats
*/
exports.getOrderStats = async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      statusCounts,
      totalOrders,
      thisWeekTotal,
      prevWeekTotal,
      enteredThisWeekAgg,
      enteredPrevWeekAgg,
    ] = await Promise.all([
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: weekAgo } }),
      Order.countDocuments({
        createdAt: { $gte: twoWeeksAgo, $lt: weekAgo },
      }),
      Order.aggregate([
        { $unwind: "$statusHistory" },
        { $match: { "statusHistory.changedAt": { $gte: weekAgo } } },
        { $group: { _id: "$statusHistory.status", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $unwind: "$statusHistory" },
        {
          $match: {
            "statusHistory.changedAt": { $gte: twoWeeksAgo, $lt: weekAgo },
          },
        },
        { $group: { _id: "$statusHistory.status", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = {};
    statusCounts.forEach((s) => {
      countMap[s._id] = s.count;
    });

    const thisWeekMap = {};
    enteredThisWeekAgg.forEach((s) => {
      thisWeekMap[s._id] = s.count;
    });

    const prevWeekMap = {};
    enteredPrevWeekAgg.forEach((s) => {
      prevWeekMap[s._id] = s.count;
    });

    const totalGrowthPercent =
      prevWeekTotal === 0
        ? thisWeekTotal > 0
          ? 100
          : 0
        : Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 1000) /
          10;

    const byStatus = {};
    const deltaThisWeek = {};
    ORDER_STATUS_VALUES.forEach((status) => {
      byStatus[status] = countMap[status] || 0;
      deltaThisWeek[status] =
        (thisWeekMap[status] || 0) - (prevWeekMap[status] || 0);
    });

    return res.status(200).json({
      stats: {
        total: totalOrders,
        totalNewThisWeek: thisWeekTotal,
        totalGrowthPercent,
        byStatus,
        deltaThisWeek,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  قائمة الطلبات - فلترة بالحالة + بحث (رقم الطلب / اسم أو هاتف الزبون /
  اسم أو هاتف التوصيل / المدينة) + ترتيب + تقسيم صفحات
  GET /api/admin/orders
*/
exports.getOrders = async (req, res) => {
  try {
    const { status, search, sort = "newest", page = 1, limit = 15 } = req.query;

    const andConditions = [];

    if (status && status !== "all") {
      if (!ORDER_STATUS_VALUES.includes(status)) {
        return res.status(400).json({ message: "حالة غير صالحة" });
      }
      andConditions.push({ status });
    }

    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");

      const matchingCustomers = await Customer.find({
        $or: [{ fullName: regex }, { phone: regex }],
      }).select("_id");

      andConditions.push({
        $or: [
          { orderNumber: regex },
          { "shipping.fullName": regex },
          { "shipping.phone": regex },
          { "shipping.city": regex },
          { customerId: { $in: matchingCustomers.map((c) => c._id) } },
        ],
      });
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amount_desc: { grandTotal: -1 },
      amount_asc: { grandTotal: 1 },
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "fullName phone")
        .sort(sortMap[sort] || sortMap.newest)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      orders: orders.map(serializeOrderAdminSummary),
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
  تفاصيل طلب واحد كاملة (بدون قيد على الزبون - الأدمن بيقدر يشوف أي طلب)
  GET /api/admin/orders/:id
*/
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف طلب غير صالح" });
    }

    const order = await Order.findById(id).populate(
      "customerId",
      "fullName phone email",
    );

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    return res.status(200).json({ order: serializeOrderAdminDetail(order) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تغيير حالة الطلب - بيتحقق من صحة الانتقال منطقيًا أولًا (utils/
  orderStatusEngine.js)، وبيرجّع المخزون تلقائيًا لحظة أول انتقال لحالة
  "ملغي" أو "مرتجع" (مرة وحدة بس لكل طلب). ممكن يترفق رقم تتبع الشحنة
  وملاحظة بنفس الطلب (مثلاً لحظة التحويل لـ"تم الشحن")
  PATCH /api/admin/orders/:id/status   body: { status, note?, trackingNumber? }
*/
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = "", trackingNumber } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف طلب غير صالح" });
    }
    if (!ORDER_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    if (!canTransition(order.status, status)) {
      return res.status(400).json({
        message: `لا يمكن تغيير حالة الطلب من "${
          STATUS_LABELS[order.status]
        }" إلى "${STATUS_LABELS[status]}" مباشرة`,
      });
    }

    const statusChanged = order.status !== status;
    order.status = status;

    if (typeof trackingNumber === "string") {
      order.trackingNumber = trackingNumber.trim();
    }

    if (statusChanged) {
      order.statusHistory.push({
        status,
        changedAt: new Date(),
        note: (note || "").trim().slice(0, 500),
      });
    }

    if (RESTOCK_STATUSES.includes(status)) {
      await restockOrderItems(order);
    }

    await order.save();

    // ⚠️ إشعار الزبون بتحديث حالة طلبه - بعد الحفظ مباشرة عشان orderNumber
    // مضمون يكون موجود. ملفوف بـ try/catch خاص فيه عشان فشل الإشعار (لو
    // صار) ما يوقف نجاح تحديث حالة الطلب نفسه أبدًا
    if (statusChanged && ORDER_NOTIFICATION_TEMPLATES[status]) {
      try {
        const template = ORDER_NOTIFICATION_TEMPLATES[status];
        await createNotification({
          customerId: order.customerId,
          type: "order_status",
          title: template.title,
          message: template.message(order.orderNumber),
          link: `/orders/${order._id}`,
          relatedId: order._id,
        });
      } catch (notifyError) {
        console.error("تعذر إرسال إشعار تحديث حالة الطلب:", notifyError);
      }
    }

    await order.populate("customerId", "fullName phone email");

    return res.status(200).json({
      message: "تم تحديث حالة الطلب بنجاح",
      order: serializeOrderAdminDetail(order),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حفظ/تعديل الملاحظة الداخلية على الطلب (غير ظاهرة للزبون أبدًا)
  PATCH /api/admin/orders/:id/note   body: { note }
*/
exports.updateOrderNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف طلب غير صالح" });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { adminNote: (note || "").trim().slice(0, 1000) } },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    return res.status(200).json({
      message: "تم حفظ الملاحظة",
      adminNote: order.adminNote,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

const mongoose = require("mongoose");
const Customer = require("../models/customer");
const Order = require("../models/order");
const CartRecoveryLog = require("../models/cartRecoveryLog");
const { buildCartResult } = require("../utils/serializeCart");
const { createNotification } = require("../utils/notificationEngine");

/*
  abandonedCart.controller.js (لوحة تحكم الأدمن)
  ------------------------------------------------------------------
  صفحة "السلات المتروكة": كل سلة زبون ما صار فيها أي نشاط (إضافة قطعة)
  منذ ABANDONED_THRESHOLD_HOURS ساعة على الأقل بتعتبر "متروكة" - الهدف
  تشجيع الزبون يكمل شراءه، إما بتذكير بسيط أو بكوبون خصم مخصص له

  ⚠️ قيمة السلة (subtotal) محسوبة عبر buildCartResult (utils/serializeCart.js)
  نفسها المستخدمة بواجهة الزبون بالضبط - مصدر حقيقة واحد للتسعير بكل
  النظام، بدون أي تكرار لمنطق حساب الأسعار هون

  "قيمة مستردة" و"تم الاسترداد" محسوبين لحظيًا (مش حقل مخزّن) بمقارنة كل
  إجراء استرداد سابق (تذكير/كوبون - CartRecoveryLog) مع طلبات الزبون
  الفعلية اللي صارت بعده - نفس فلسفة الحالة المحسوبة لحظيًا بكل النظام
*/
const ABANDONED_THRESHOLD_HOURS = 3;

/*
  إحصائيات + قائمة السلات المتروكة حاليًا دفعة وحدة
  GET /api/admin/abandoned-carts?sort=newest|oldest|value&page=&limit=
*/
exports.getAbandonedCartsOverview = async (req, res) => {
  try {
    const { sort = "newest", page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));

    const customers = await Customer.find({
      "cart.0": { $exists: true },
    }).select("fullName phone cart appliedCoupon");

    const now = Date.now();
    const thresholdMs = ABANDONED_THRESHOLD_HOURS * 60 * 60 * 1000;

    // 1) نفلتر بس السلات يلي فعليًا "متروكة" (آخر نشاط أقدم من الحد الأدنى)
    const candidates = [];
    customers.forEach((customer) => {
      const lastActivity = customer.cart.reduce(
        (max, item) => Math.max(max, new Date(item.addedAt).getTime()),
        0,
      );
      if (now - lastActivity < thresholdMs) return; // لسه نشطة، الزبون يتسوق حاليًا
      candidates.push({ customer, lastActivity });
    });

    // 2) لكل سلة مرشّحة، نحسب قيمتها الحقيقية عبر نفس محرك السلة المستخدم
    // بواجهة الزبون (يستبعد تلقائيًا أي بند غير متاح فعليًا)
    const rows = [];
    for (const { customer, lastActivity } of candidates) {
      const cartResult = await buildCartResult(customer.cart, {
        customerId: customer._id,
        appliedCouponCode: customer.appliedCoupon,
      });

      if (cartResult.totals.subtotal <= 0) continue; // كل البنود غير متاحة فعليًا حاليًا

      rows.push({
        customerId: customer._id,
        fullName: customer.fullName,
        phone: customer.phone,
        itemsCount: cartResult.totals.totalQuantity,
        cartValue: cartResult.totals.subtotal,
        lastActivity: new Date(lastActivity),
      });
    }

    const sortFns = {
      newest: (a, b) => b.lastActivity - a.lastActivity, // الأحدث تركًا أولًا
      oldest: (a, b) => a.lastActivity - b.lastActivity,
      value: (a, b) => b.cartValue - a.cartValue,
    };
    rows.sort(sortFns[sort] || sortFns.newest);

    const total = rows.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = rows.slice(start, start + limitNum);
    const lockedValue = rows.reduce((sum, r) => sum + r.cartValue, 0);

    // 3) إحصائيات الاسترداد - محسوبة لحظيًا من سجل CartRecoveryLog مقارنةً
    // بطلبات الزبائن الفعلية (شوف شرح الموديل/الملف فوق)
    const recoveryLogs = await CartRecoveryLog.find({}).sort({
      createdAt: -1,
    });

    let recoveredValue = 0;
    let recoveredCount = 0;

    if (recoveryLogs.length > 0) {
      const logCustomerIds = [
        ...new Set(recoveryLogs.map((l) => l.customerId.toString())),
      ];
      const relevantOrders = await Order.find({
        customerId: { $in: logCustomerIds },
      })
        .select("customerId createdAt")
        .sort({ createdAt: 1 });

      const orderDatesByCustomer = {};
      relevantOrders.forEach((o) => {
        const cid = o.customerId.toString();
        if (!orderDatesByCustomer[cid]) orderDatesByCustomer[cid] = [];
        orderDatesByCustomer[cid].push(o.createdAt);
      });

      // كل زبون بيُحتسب "مسترد" مرة وحدة بس (أقدم سجل إجراء أدى فعليًا
      // لطلب بعده) - عشان ما يتضاعف نفس الاسترداد لو الأدمن أرسل أكتر
      // من تذكير/كوبون لنفس الزبون بفترات مختلفة
      const countedCustomers = new Set();
      const sortedLogsAsc = [...recoveryLogs].sort(
        (a, b) => a.createdAt - b.createdAt,
      );

      sortedLogsAsc.forEach((log) => {
        const cid = log.customerId.toString();
        if (countedCustomers.has(cid)) return;

        const orderDates = orderDatesByCustomer[cid] || [];
        const hasOrderAfter = orderDates.some(
          (d) => new Date(d).getTime() > log.createdAt.getTime(),
        );

        if (hasOrderAfter) {
          recoveredValue += log.cartValueAtSend;
          recoveredCount += 1;
          countedCustomers.add(cid);
        }
      });
    }

    return res.status(200).json({
      stats: {
        lockedValue,
        recoveredValue,
        recoveredCount,
        abandonedCartsCount: total,
      },
      carts: paginated.map((r) => ({
        customerId: r.customerId,
        fullName: r.fullName,
        phone: r.phone,
        itemsCount: r.itemsCount,
        cartValue: r.cartValue,
        lastActivity: r.lastActivity,
      })),
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
  إرسال إشعار تذكير للزبون بسلته المتروكة - بيسجّل سطر بـ CartRecoveryLog
  عشان نقدر نحسب لاحقًا هل صار "استرداد" فعلي (طلب حقيقي بعد هذا التاريخ)
  POST /api/admin/abandoned-carts/:customerId/remind
*/
exports.sendCartReminder = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "معرّف زبون غير صالح" });
    }

    const customer =
      await Customer.findById(customerId).select("cart appliedCoupon");
    if (!customer) {
      return res.status(404).json({ message: "الزبون غير موجود" });
    }
    if (!customer.cart || customer.cart.length === 0) {
      return res.status(400).json({ message: "سلة هذا الزبون فاضية حاليًا" });
    }

    const cartResult = await buildCartResult(customer.cart, {
      customerId: customer._id,
      appliedCouponCode: customer.appliedCoupon,
    });

    if (cartResult.totals.subtotal <= 0) {
      return res
        .status(400)
        .json({ message: "لا توجد بنود متاحة فعليًا بسلة هذا الزبون حاليًا" });
    }

    await createNotification({
      customerId,
      type: "cart_reminder",
      title: "🛒 نسيت شيء بسلتك!",
      message: `عندك ${cartResult.totals.totalQuantity} قطعة بسلتك بانتظارك - أكمل طلبك قبل ما تنفد`,
      link: "/cart",
    });

    await CartRecoveryLog.create({
      customerId,
      actionType: "reminder",
      cartValueAtSend: cartResult.totals.subtotal,
      cartItemsCountAtSend: cartResult.totals.totalQuantity,
    });

    return res.status(200).json({ message: "تم إرسال تذكير للزبون" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

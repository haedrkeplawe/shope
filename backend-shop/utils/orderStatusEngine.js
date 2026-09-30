const Product = require("../models/product");

/*
  utils/orderStatusEngine.js
  ------------------------------------------------------------------
  قواعد الانتقال بين حالات الطلب (Order.status) + منطق إرجاع المخزون
  التلقائي عند الإلغاء/الإرجاع - كل هذا في مكان واحد بدل ما ينتشر
  بالكنترولر، بنفس فلسفة couponEngine.js/applyOffers.js بالضبط (منطق
  مستقل قابل لإعادة الاستخدام ومعزول تمامًا عن طبقة الـ HTTP)

  فلسفة الانتقالات: كل حالة إلها الحالات التالية المسموح الانتقال لها
  منطقيًا بس - عشان نمنع قفزات غير منطقية (مثلاً "جديد" مباشرة لـ"تم
  التسليم" من غير ما يمر بمراحل الشحن)، بس بنفس الوقت منسمح بالإلغاء من
  أغلب المراحل المبكرة، ومنسمح بالإرجاع بعد الشحن أو حتى بعد التسليم
  (زبون رجّع القطعة). "ملغي" و"مرتجع" حالتين نهائيتين (Terminal) - ما
  فيهم رجوع لأي حالة تانية من لوحة تحكم الأدمن

  -------------------- تحديث: بوابة التحقق من دفع شام كاش --------------------
  طلب شام كاش (order.paymentMethod === "shamcash") ما بيقدر يتقدّم لأي
  مرحلة تجهيز حقيقية (تأكيد/تجهيز/شحن/تسليم/إرجاع) طالما order.paymentStatus
  مش "verified" بعد - الأدمن هو المسؤول الوحيد عن التحقق اليدوي من صورة
  الإيصال (شوف adminOrder.controller.js → confirmPayment/rejectPayment)،
  ما في أي تحقق تلقائي بالنظام. الإلغاء مستثنى عن قصد من هاي البوابة -
  لازم يضل ممكن نلغي طلب دفعه لسه معلّق أو انرفض. عشان هيك canTransition
  تحت بتاخد مستند الطلب كامل (مش الحالة النصية بس متل قبل) عشان توصل
  لـ paymentMethod/paymentStatus
*/
const VALID_TRANSITIONS = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

// كل قيم الحالة الصالحة - مشتقة من مفاتيح خريطة الانتقالات فوق، عشان
// تضل مصدر حقيقة وحيد (لو أضفنا حالة جديدة بالمستقبل منضيفها هون بس)
const ORDER_STATUS_VALUES = Object.keys(VALID_TRANSITIONS);

// الحالتين اللي بيصير فيهم إرجاع المخزون تلقائيًا
const RESTOCK_STATUSES = ["cancelled", "returned"];

// كل الحالات يلي محتاجة تحقق دفع مؤكد (شام كاش) قبل ما نسمح بالوصول
// إلها - كل شي عدا "ملغي" (شوف الشرح فوق)
const PAYMENT_GATED_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
];

/*
  هل مسموح الانتقال من حالة لحالة تانية؟
  - إعادة تحديد نفس الحالة (from === to) مسموحة دايمًا (مثلاً الأدمن بس
    عدّل رقم التتبع أو الملاحظة من غير ما يغيّر الحالة فعليًا)
  - order هون مستند الطلب كامل (مش نص الحالة بس) - محتاجينه كامل عشان
    بوابة الدفع فوق تقدر تشوف paymentMethod/paymentStatus
*/
const canTransition = (order, to) => {
  const from = order.status;
  if (from === to) return true;
  if (!VALID_TRANSITIONS[from]?.includes(to)) return false;

  if (
    order.paymentMethod === "shamcash" &&
    order.paymentStatus !== "verified" &&
    PAYMENT_GATED_STATUSES.includes(to)
  ) {
    return false;
  }

  return true;
};

/*
  إرجاع الكمية المحجوزة لكل قطعة بالطلب للمخزون الفعلي، وإعادة القطعة
  لحالة "متاحة" لو كانت "مباعة" وصار عندها كمية تاني - بيصير مرة وحدة
  بس لكل طلب (order.stockRestored) بغض النظر عن كم مرة تغيّرت حالته
  بعدين، عشان ما تتكرر الزيادة على نفس الطلب أكتر من مرة بالغلط.

  ⚠️ الطلب (order) هون Document حقيقي (مش نسخة serialized) - المسؤولية
  عن استدعاء order.save() بعد هاي الدالة تقع على الكنترولر يلي بيستدعيها
*/
const restockOrderItems = async (order) => {
  if (order.stockRestored) return;

  for (const item of order.items) {
    const product = await Product.findById(item.productId);
    if (!product) continue; // القطعة انحذفت نهائيًا من الكتالوج - ما في شي نرجّعه

    product.quantity = (product.quantity || 0) + item.quantity;
    if (product.publishStatus === "sold" && product.quantity > 0) {
      product.publishStatus = "published";
    }
    await product.save();
  }

  order.stockRestored = true;
};

module.exports = {
  VALID_TRANSITIONS,
  ORDER_STATUS_VALUES,
  RESTOCK_STATUSES,
  PAYMENT_GATED_STATUSES,
  canTransition,
  restockOrderItems,
};

const Coupon = require("../models/coupon");
const Order = require("../models/order");

/*
  utils/couponEngine.js
  ------------------------------------------------------------------
  المحرك المركزي الوحيد للتحقق من صلاحية كوبون + حساب قيمة خصمه - نفس
  فلسفة utils/applyOffers.js تمامًا (حساب لحظي، بدون تعديل أي بيانات)،
  بس هون على مستوى "الطلب الكامل" (subtotal) مش على مستوى منتج واحد

  ⚠️ لازم يستخدم هذا المحرك (evaluateCoupon) في كل مكان بيتعامل مع
  كوبون - ممنوع تكرار منطق التحقق بأي كنترولر، عشان قواعد الكوبون تضل
  مصدر حقيقة واحد. الأماكن الثلاثة اللي بتستخدمه فعليًا:

  1) utils/serializeCart.js - حساب لحظي كل ما تنفتح السلة، وبيكتشف لو
     الكوبون المطبّق ما عاد صالح (انتهى/اتوقف/تغيّر المجموع) فيرجع إشارة
     للكنترولر يمسحه من حساب الزبون تلقائيًا
  2) controllers/customer.controller.js - عند "تطبيق" كود كوبون جديد
     على السلة (POST /customers/cart/coupon)
  3) controllers/order.controller.js - التحقق الأخير النهائي وقت تثبيت
     الطلب فعليًا داخل نفس الـ Transaction المستخدمة لإنزال المخزون
     (نفس فلسفة إعادة التحقق من توفر الكمية لحظة الحفظ، حماية من أي
     Race Condition بين فتح السلة وتأكيد الطلب)

  -------------------- حد الاستخدام لكل زبون --------------------
  ما بنخزنش عدّاد منفصل لكل زبون (تفاديًا لمصدرين للحقيقة ممكن يتعارضوا)
  - بدل هيك بنعتمد على موديل Order نفسه كسجل تاريخي: بنعدّ كم طلب فعلي
  سابق لنفس الزبون فيه نفس couponId. هاد بيعني إن الحد بيتفعّل فقط لو
  فعلاً اتحول لطلب حقيقي (مش مجرد "تطبيق" بالسلة لحظيًا)
*/

const computeDiscountAmount = (coupon, subtotal) => {
  let discount =
    coupon.type === "percentage"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;

  if (coupon.type === "percentage" && coupon.maxDiscountAmount) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  // الخصم ما بيتخطى أبدًا مجموع الطلب نفسه - منتجنب رقم إجمالي سالب
  return Math.max(0, Math.min(Math.round(discount), Math.round(subtotal)));
};

/*
  بيرجع دائمًا شكل موحّد:
  - صالح: { valid: true, coupon, discountAmount }
  - غير صالح: { valid: false, reason, message }
  "reason" مفيدة لو الفرونت حاب يميّز الحالة برمجيًا، "message" جاهزة
  للعرض المباشر للزبون
*/
const evaluateCoupon = async ({ code, customerId, subtotal }) => {
  if (!code || !code.trim()) {
    return { valid: false, reason: "no_code", message: "أدخل كود الكوبون" };
  }

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) {
    return {
      valid: false,
      reason: "not_found",
      message: "كود الكوبون غير صحيح",
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      reason: "paused",
      message: "هذا الكوبون متوقف حاليًا",
    };
  }

  const now = new Date();
  if (now < coupon.startDate) {
    return {
      valid: false,
      reason: "scheduled",
      message: "هذا الكوبون لم يفعّل بعد",
    };
  }
  if (now > coupon.endDate) {
    return {
      valid: false,
      reason: "expired",
      message: "انتهت صلاحية هذا الكوبون",
    };
  }

  if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
    return {
      valid: false,
      reason: "exhausted",
      message: "تم استنفاد عدد مرات استخدام هذا الكوبون",
    };
  }

  if (coupon.scopeType === "specific_customers") {
    const allowedIds = coupon.customerIds.map((id) => id.toString());
    if (!customerId || !allowedIds.includes(customerId.toString())) {
      return {
        valid: false,
        reason: "not_eligible",
        message: "هذا الكوبون غير متاح لحسابك",
      };
    }
  }

  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      reason: "min_order",
      message: `الحد الأدنى لمجموع الطلب لاستخدام هذا الكوبون ${coupon.minOrderAmount.toLocaleString(
        "en-US",
      )} ل.س`,
    };
  }

  if (customerId) {
    const usedByCustomer = await Order.countDocuments({
      customerId,
      couponId: coupon._id,
    });
    if (usedByCustomer >= coupon.maxUsagePerCustomer) {
      return {
        valid: false,
        reason: "customer_limit",
        message: "لقد استخدمت هذا الكوبون بالحد الأقصى المسموح لحسابك",
      };
    }
  }

  const discountAmount = computeDiscountAmount(coupon, subtotal);

  return { valid: true, coupon, discountAmount };
};

module.exports = { evaluateCoupon, computeDiscountAmount };

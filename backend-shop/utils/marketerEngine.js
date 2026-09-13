const Customer = require("../models/customer");

/*
  utils/marketerEngine.js
  ------------------------------------------------------------------
  المحرك المركزي الوحيد للتحقق من صلاحية رمز مسوّق + حساب قيمة عمولته -
  نفس فلسفة utils/couponEngine.js بالضبط، بس هون المرجع مش موديل Coupon
  مستقل - المسوّق هو حساب Customer نفسه المعلَّم بحقل marketer.isMarketer

  ⚠️ لازم يُستخدم هذا المحرك (evaluateReferralCode) بكل مكان بيتعامل مع
  رمز مسوّق - ممنوع تكرار منطق التحقق بأي كنترولر. المكان الوحيد يلي
  بيستخدمه فعليًا حاليًا هو controllers/order.controller.js لحظة تثبيت
  الطلب (التحقق النهائي، نفس نقطة تحقق الكوبون ومنطقة الشحن بالضبط) - ما
  في تطبيق "على السلة" مسبق زي الكوبون، لأنه رمز المسوّق قرار إسناد
  لمرة وحدة بس لحظة تحويل السلة لطلب فعلي (مش حالة دائمة على حساب الزبون)

  -------------------- أساس حساب العمولة --------------------
  العمولة = نسبة المسوّق × (subtotal - couponDiscount) - يعني صافي قيمة
  المنتجات الفعلية المدفوعة بعد أي خصم كوبون، بدون احتساب الشحن إطلاقًا
  (الشحن مش ربح فعلي للمتجر أصلاً). لو الكوبون كان أكبر من الـ subtotal
  لأي سبب، النتيجة بتضل محصورة بين صفر والـ subtotal نفسه - نفس أسلوب
  الحماية المستخدم بـ computeDiscountAmount بـ couponEngine.js بالضبط
*/

const computeCommissionAmount = (
  subtotal,
  couponDiscount,
  commissionPercentage,
) => {
  const netAmount = Math.max(0, subtotal - (couponDiscount || 0));
  const commission = (netAmount * (commissionPercentage || 0)) / 100;
  return Math.max(0, Math.round(commission));
};

/*
  بيرجع دائمًا شكل موحّد:
  - صالح: { valid: true, marketer, commissionPercentage, commissionAmount }
    (marketer هون هو مستند Customer كامل - fullName + marketer.* بس)
  - غير صالح: { valid: false, reason, message }
*/
const evaluateReferralCode = async ({ code, subtotal, couponDiscount = 0 }) => {
  if (!code || !code.trim()) {
    return { valid: false, reason: "no_code", message: "أدخل رمز المسوّق" };
  }

  const marketer = await Customer.findOne({
    "marketer.code": code.trim().toUpperCase(),
    "marketer.isMarketer": true,
  }).select("fullName marketer");

  if (!marketer) {
    return {
      valid: false,
      reason: "not_found",
      message: "رمز المسوّق غير صحيح",
    };
  }

  if (marketer.marketer.status !== "active") {
    return {
      valid: false,
      reason: "paused",
      message: "هذا الرمز غير فعّال حاليًا",
    };
  }

  const commissionAmount = computeCommissionAmount(
    subtotal,
    couponDiscount,
    marketer.marketer.commissionPercentage,
  );

  return {
    valid: true,
    marketer,
    commissionPercentage: marketer.marketer.commissionPercentage,
    commissionAmount,
  };
};

module.exports = { evaluateReferralCode, computeCommissionAmount };

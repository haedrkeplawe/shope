// user
const { resolveCustomerSession } = require("../utils/customerSession");

/*
  ميدل وير اختياري للتعرف على الزبون لو موجود، بدون رفض الطلب أبدًا لو
  مش موجود أو غير صالح - نفس آلية verifyCustomer.js بالضبط بس بدون أي
  رفض (401) على الإطلاق. هاد هو أساس الميزة الجديدة: السماح بتصفح
  الموقع بالكامل كزائر (بدون تسجيل دخول)، مع الاستفادة من هوية الزبون
  لو كانت موجودة فعليًا (عرض خصم عضويته، حجب/إظهار منتجات "للأعضاء فقط"،
  تلوين تقييمه هو بالذات وسط باقي التقييمات...)

  ⚠️ الفرق الوحيد عن verifyCustomer: هون req.customerAuth بيصير null
  (مش استثناء 401) لو مفيش توكن صالح - فأي كنترولر بيستخدم هاد الميدل
  وير لازم يتعامل مع req.customerAuth بـ ?. (optional chaining) بكل
  مكان. هاد أصلاً الأسلوب المتّبع بمعظم shop.controller.js من زمان (شوف
  filterVisibleForCustomer/getEffectiveTier بـ utils/membershipEngine.js -
  مبنية أصلاً على استقبال customerId فاضي ومعاملته كزائر بالباقة المجانية)

  ⚠️ نفس فحص الداتابيس والتجديد التلقائي يلي بـ verifyCustomer (شوف
  utils/customerSession.js) - فالحساب المعلّق بيتعامل كزائر هون كمان،
  وتصفح الزبون العادي للمتجر بيجدد جلسته بدون ما يفتح صفحة محمية
*/
const attachCustomerIfPresent = async (req, res, next) => {
  try {
    const session = await resolveCustomerSession(req, res);
    req.customerAuth = session.status === "ok" ? session.auth : null;
  } catch (error) {
    // عطل بالداتابيس - منكمّل الطلب كزائر بدل ما نرفضه، بدون ما نمسح الكوكي
    console.error(error);
    req.customerAuth = null;
  }

  next();
};

module.exports = attachCustomerIfPresent;

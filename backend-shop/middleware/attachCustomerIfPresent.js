// user
const jwt = require("jsonwebtoken");

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
*/
const attachCustomerIfPresent = (req, res, next) => {
  const token = req.cookies?.customerToken;

  if (!token) {
    req.customerAuth = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.customerAuth = decoded;
  } catch (error) {
    // توكن غير صالح أو منتهي - نتعامل مع الطلب كزائر بدل ما نرفضه بالكامل
    req.customerAuth = null;
  }

  next();
};

module.exports = attachCustomerIfPresent;

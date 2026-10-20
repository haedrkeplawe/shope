const ShippingZone = require("../models/shippingZone");

/*
  utils/shippingEngine.js
  ------------------------------------------------------------------
  المحرك المركزي الوحيد لحساب سعر الشحن - نفس فلسفة utils/couponEngine.js
  بالضبط: حساب لحظي بدون تعديل أي بيانات، ومفروض يُستخدم بكل مكان محتاج
  يحسب أو يتحقق من سعر الشحن، بدل ما يتكرر نفس المنطق بأكتر من كنترولر

  ⚠️ ليه المدينة هي أساس الحساب مش المنطقة مباشرة؟
  الزبون بصفحة الدفع بيختار "مدينته" مباشرة (تجربة أبسط وأوضح إله) -
  مش مفروض يعرف أصلاً إنه في تجميع داخلي اسمه "منطقة شحن" بالنظام. لهيك
  resolveZoneByCity هي نقطة الدخول الطبيعية: بتاخد اسم المدينة وبترجع
  منطقة الشحن التابعة إلها (لو موجودة ونشطة)

  الأماكن يلي المفروض تستخدم هالمحرك فعليًا:
  1) controllers/shop.controller.js - عرض قائمة المدن/المناطق المتاحة
     للزبون بصفحة الدفع (معاينة بس، بدون فرض أي حساب نهائي)
  2) controllers/order.controller.js - التحقق النهائي + حساب السعر
     الفعلي الملزم لحظة تحويل السلة لطلب فعلي (نفس فلسفة إعادة التحقق
     من الكوبون والمخزون وقت التأكيد - مش الاعتماد على أي شيء اختاره
     الزبون بالفرونت كحقيقة نهائية)
*/

/*
  بيرجع منطقة الشحن (Document) التابعة لمدينة معينة، أو null لو ما في
  أي منطقة نشطة بتغطي هاي المدينة - المطابقة case-insensitive وبعد trim
  عشان فروق بسيطة بالمسافات/الحالة ما تمنع المطابقة الصحيحة
*/
const resolveZoneByCity = async (city) => {
  if (!city || !city.trim()) return null;

  const normalized = city.trim();
  const zones = await ShippingZone.find({ isActive: true });

  return (
    zones.find((zone) =>
      zone.cities.some(
        (c) => c.trim().toLowerCase() === normalized.toLowerCase(),
      ),
    ) || null
  );
};

/*
  تسمية موحّدة لمدة التوصيل - مستخدمة بالعرض (أدمن/زبون) وبالـ Snapshot
  المخزّن على الطلب نفسه سوا، عشان نفس الصيغة بالضبط بكل مكان
*/
const formatDurationLabel = (zone) => {
  if (!zone) return "";
  const { deliveryDurationMin: min, deliveryDurationMax: max } = zone;
  if (min === max) return `${min} ${min === 1 ? "يوم" : "أيام"}`;
  return `${min}-${max} أيام`;
};

/*
  بيحسب سعر الشحن الفعلي لمنطقة معينة حسب مجموع السلة (subtotal) -
  الشحن المجاني (لو مفعّل بهاي المنطقة) بيتفعّل تلقائيًا لما المجموع
  يوصل أو يتخطى الحد المحدد
*/
const computeShippingPrice = (zone, subtotal) => {
  const isFree =
    zone.freeShippingThreshold !== null &&
    zone.freeShippingThreshold !== undefined &&
    subtotal >= zone.freeShippingThreshold;

  return {
    price: isFree ? 0 : zone.price,
    isFree,
  };
};

/*
  التحقق النهائي الملزم وقت تثبيت الطلب فعليًا - بيرجع دائمًا شكل موحّد
  زي evaluateCoupon بالضبط:
  - صالح: { valid: true, zone, price, isFree, durationLabel }
  - غير صالح: { valid: false, message }

  بيتحقق من كل شي من الصفر (مش من أي قيمة جاية من الفرونت): إنه المنطقة
  لسا موجودة ونشطة، وإنه المدينة يلي بعتها الزبون فعلاً تابعة إلها -
  عشان لو تغيّر شي بالنظام (الأدمن أوقف/حذف/عدّل المنطقة) بين لحظة فتح
  صفحة الدفع ولحظة الضغط على "تأكيد الطلب"، ينكشف هذا فورًا
*/
const evaluateShipping = async ({ zoneId, city, subtotal }) => {
  if (!city || !city.trim()) {
    return { valid: false, message: "الرجاء اختيار مدينة التوصيل" };
  }

  const zone = zoneId
    ? await ShippingZone.findById(zoneId)
    : await resolveZoneByCity(city);

  if (!zone || !zone.isActive) {
    return {
      valid: false,
      message:
        "منطقة الشحن المختارة لم تعد متاحة، الرجاء اختيار مدينتك من جديد",
    };
  }

  const normalized = city.trim().toLowerCase();
  const cityCovered = zone.cities.some(
    (c) => c.trim().toLowerCase() === normalized,
  );
  if (!cityCovered) {
    return {
      valid: false,
      message:
        "هذه المدينة لم تعد مشمولة بمنطقة الشحن المختارة، الرجاء إعادة الاختيار",
    };
  }

  const { price, isFree } = computeShippingPrice(zone, subtotal);

  return {
    valid: true,
    zone,
    price,
    isFree,
    durationLabel: formatDurationLabel(zone),
  };
};

module.exports = {
  resolveZoneByCity,
  computeShippingPrice,
  formatDurationLabel,
  evaluateShipping,
};

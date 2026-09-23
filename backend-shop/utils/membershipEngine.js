const MembershipTier = require("../models/membershipTier");
const Customer = require("../models/customer");

/*
  utils/membershipEngine.js
  ------------------------------------------------------------------
  المحرك المركزي الوحيد لكل منطق باقات العضوية - نفس فلسفة
  couponEngine.js/shippingEngine.js بالضبط (حساب لحظي، بدون تعديل أي
  بيانات، بدون تخزين حالة مشتقة). ثلاث مسؤوليات:

  1) getEffectiveTier: تحديد الباقة الفعلية لزبون معيّن لحظة الطلب
  2) evaluateMembership: حساب خصم الطلب + أهلية التوصيل المجاني
  3) isProductVisibleToCustomer / filterVisibleForCustomer: حجب منتجات
     "membersOnly" حسب الوقت المتبقي على انتهاء فترة الوصول المبكر

  ⚠️ خصم العضوية والتوصيل المجاني **مستقلان كليًا عن الكوبون** - بيتطبقوا
  تلقائيًا بمجرد تحقق شرط الباقة (الحد الأدنى)، بغض النظر عن وجود كوبون
  مطبّق من عدمه. مفروض يُستخدم هذا المحرك بكل مكان بيحسب مجموع الطلب:
  1) utils/serializeCart.js - معاينة لحظية بصفحة السلة
  2) controllers/order.controller.js - الحساب النهائي الملزم وقت تثبيت
     الطلب فعليًا
  3) controllers/shop.controller.js - حجب/إظهار منتجات "للأعضاء فقط"
     بقوائم المتجر وقسم "وصل حديثًا للأعضاء المميزين"
*/

/*
  الباقة المجانية - الحالة الطبيعية التلقائية لكل زبون بدون تعيين صريح.
  ⚠️ معاملة كسلوك طبيعي ثابت دايمًا بطلب صريح من صاحب المشروع - ما فيها
  حالة "غير موجودة" منطقيًا (بتتزرع دايمًا بـ seedDefaults.js)، فلو ما
  انلقت لسبب استثنائي (قبل أول تشغيل للسيرفر مثلاً) منرجع قيم افتراضية
  آمنة (بلا أي ميزة) بدل ما نكسر أي حساب طلب
*/
const FALLBACK_FREE_TIER = {
  tierKey: "free",
  displayName: "العضوية المجانية",
  discountPercentage: 0,
  minPurchaseForDiscount: 0,
  freeShippingMinOrder: 0,
  allowStacking: true,
  earlyAccessDelayHours: 0,
  isActive: true,
};

const getFreeTier = async () => {
  const tier = await MembershipTier.findOne({ tierKey: "free" });
  return tier || FALLBACK_FREE_TIER;
};

/*
  الباقة الفعلية لزبون معيّن لحظة القراءة - لو الزبون بلا تعيين، أو
  باقته المعيّنة اتوقفت (isActive: false) من الأدمن، بيرجع تلقائيًا
  للباقة المجانية بدون أي خطأ - الترقية/التخفيض كله شفاف للزبون
*/
const getEffectiveTier = async (customerId) => {
  if (!customerId) return getFreeTier();

  const customer =
    await Customer.findById(customerId).select("membershipTierId");
  if (!customer || !customer.membershipTierId) return getFreeTier();

  const tier = await MembershipTier.findById(customer.membershipTierId);
  if (!tier || !tier.isActive) return getFreeTier();

  return tier;
};

/*
  حساب خصم/توصيل مجاني العضوية لطلب معيّن - بيرجع دائمًا شكل موحّد:
  { tier, discountAmount, freeShipping, discountEligible, shippingEligible, resolved }

  ⚠️ shippingPrice: سعر الشحن العادي (بدون وعي بالعضوية) - لازم يكون
  معروف عشان نقدر نحسم بين الخصم والتوصيل المجاني لو الباقة ما بتسمح
  بالجمع بينهم (allowStacking: false) والاثنين مؤهلين سوا؛ منطبّق
  الأنفع للزبون بالريال. لو null (مثلاً معاينة السلة قبل ما الزبون
  يختار مدينته، فسعر الشحن مش معروف بعد)، منرجع الاثنين "مؤهلين" بدون
  حسم نهائي (resolved: false) - للعرض المعلوماتي بس، مش ملزم
*/
const evaluateMembership = async ({
  customerId,
  subtotal,
  shippingPrice = null,
}) => {
  const tier = await getEffectiveTier(customerId);

  const discountEligible =
    tier.discountPercentage > 0 && subtotal >= tier.minPurchaseForDiscount;
  const shippingEligible = subtotal >= tier.freeShippingMinOrder;

  const rawDiscountAmount = discountEligible
    ? Math.max(
        0,
        Math.min(
          subtotal,
          Math.round((subtotal * tier.discountPercentage) / 100),
        ),
      )
    : 0;

  const baseResult = {
    tier,
    discountEligible,
    shippingEligible,
  };

  // سعر الشحن العادي مش معروف بعد - معلوماتي بس، الحسم النهائي بيصير
  // وقت تثبيت الطلب (order.controller.js) لما يصير معروف
  if (shippingPrice === null) {
    return {
      ...baseResult,
      discountAmount: rawDiscountAmount,
      freeShipping: shippingEligible,
      resolved: false,
    };
  }

  // الباقة بتسمح بالجمع، أو بس ميزة وحدة مؤهلة أصلاً - بلا داعي لأي حسم
  if (tier.allowStacking || !(discountEligible && shippingEligible)) {
    return {
      ...baseResult,
      discountAmount: rawDiscountAmount,
      freeShipping: shippingEligible,
      resolved: true,
    };
  }

  // ما بتسمحش بالجمع، والاثنين مؤهلين سوا - نطبّق الأنفع للزبون بالريال
  if (rawDiscountAmount >= shippingPrice) {
    return {
      ...baseResult,
      discountAmount: rawDiscountAmount,
      freeShipping: false,
      resolved: true,
    };
  }
  return {
    ...baseResult,
    discountAmount: 0,
    freeShipping: true,
    resolved: true,
  };
};

/*
  -------------------- الوصول المبكر (Early Access) --------------------
  ⚠️ بتخص بس منتجات membersOnly: true - أي منتج تاني بيظهر فورًا للجميع
  بغض النظر عن هالمنطق كليًا، تمامًا متل السلوك الحالي بدون أي تغيير

  المنتج بيظهر للزبون إذا: مش membersOnly، أو بلا publishedAt (منتج قديم
  قبل هالميزة)، أو الوقت الحالي ≥ لحظة النشر + ساعات تأخير باقة الزبون
*/
const isProductVisibleToCustomer = (product, tier) => {
  if (!product.membersOnly) return true;
  if (!product.publishedAt) return true;

  const delayHours =
    tier?.earlyAccessDelayHours ?? FALLBACK_FREE_TIER.earlyAccessDelayHours;
  const visibleAtMs =
    new Date(product.publishedAt).getTime() + delayHours * 60 * 60 * 1000;

  return Date.now() >= visibleAtMs;
};

/*
  فلترة مصفوفة منتجات حسب باقة زبون معيّن (أو زائر بدون حساب - بيتعامل
  معه كصاحب الباقة المجانية، أعلى قيمة تأخير عادةً)
*/
const filterVisibleForCustomer = async (products, customerId) => {
  const tier = await getEffectiveTier(customerId);
  return products.filter((product) =>
    isProductVisibleToCustomer(product, tier),
  );
};

/*
  منتجات "حصرية حاليًا" لزبون معيّن - يلي باقته بتخليه يشوفها، بس لسه
  ما ظهرت للباقة المجانية (أساس قسم "وصل حديثًا للأعضاء المميزين")
*/
const filterEarlyAccessOnly = async (products, customerId) => {
  const [tier, freeTier] = await Promise.all([
    getEffectiveTier(customerId),
    getFreeTier(),
  ]);

  return products.filter(
    (product) =>
      isProductVisibleToCustomer(product, tier) &&
      !isProductVisibleToCustomer(product, freeTier),
  );
};

module.exports = {
  getFreeTier,
  getEffectiveTier,
  evaluateMembership,
  isProductVisibleToCustomer,
  filterVisibleForCustomer,
  filterEarlyAccessOnly,
};

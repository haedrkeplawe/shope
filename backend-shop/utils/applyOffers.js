const Offer = require("../models/offer");
const Category = require("../models/category");

/*
  utils/applyOffers.js
  ------------------------------------------------------------------
  بيحسب "السعر الفعّال" (effectivePrice) لمجموعة منتجات بناءً على العروض
  النشطة حاليًا - من غير ما يعدّل أي شيء بالداتابيز (حساب لحظي فقط)

  ⚠️ لسه مش مربوط بأي راوت فعليًا (زي GET /api/products) - هاي أداة جاهزة
  نستخدمها لاحقًا لما نبني واجهة المتجر للزبون. حاليًا موجودة بس كطبقة
  منفصلة قابلة لإعادة الاستخدام، عشان ما نغيّر سلوك صفحات الأدمن الحالية.

  قواعد الأولوية (متفق عليها):
  1. أي منتج عنده discountEnabled=true (خصم يدوي) → ما بتأثر فيه أي عرض عام أبدًا
  2. لو المنتج مؤهل لأكتر من عرض عام بنفس الوقت: الأكثر تحديدًا يفوز
     (specific_products > category > all) ولو تعادلوا بالمستوى، الأعلى نسبة يفوز
  3. "new_customers" مش جزء من هاي الدالة - شرط خاص بالزبون نفسه (يتفحص
     في نظام الطلبات/العملاء لما يتبنى)، مش بخصائص المنتج
*/

const SCOPE_PRIORITY = { specific_products: 3, category: 2, all: 1 };

const getActiveOffers = async () => {
  const now = new Date();
  return Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    targetType: { $in: ["all", "category", "specific_products"] },
  });
};

/*
  بيبني خريطة categoryId → [subCategoryIds] عشان نوسّع عروض الفئات
  الرئيسية لتشمل فئاتها الفرعية، بنفس منطق فلترة المنتجات بصفحة المنتجات
*/
const buildCategoryExpansion = async (offers) => {
  const categoryIds = offers
    .filter((o) => o.targetType === "category" && o.categoryId)
    .map((o) => o.categoryId.toString());

  if (categoryIds.length === 0) return {};

  const subCategories = await Category.find({
    parentId: { $in: categoryIds },
  }).select("parentId");

  const map = {};
  categoryIds.forEach((id) => (map[id] = [id]));
  subCategories.forEach((sub) => {
    const parentId = sub.parentId.toString();
    map[parentId]?.push(sub._id.toString());
  });

  return map;
};

const offerMatchesProduct = (offer, product, categoryExpansion) => {
  if (offer.targetType === "all") return true;

  if (offer.targetType === "category") {
    const expandedIds = categoryExpansion[offer.categoryId?.toString()] || [];
    return (
      product.categoryId && expandedIds.includes(product.categoryId.toString())
    );
  }

  if (offer.targetType === "specific_products") {
    return offer.productIds
      .map((id) => id.toString())
      .includes(product._id.toString());
  }

  return false;
};

/*
  بيرجع نفس مصفوفة المنتجات بس مضاف عليها effectivePrice + appliedOffer
  لكل منتج مؤهل لعرض نشط (وما عندوش خصم يدوي)
*/
const attachEffectivePrice = async (products) => {
  const offers = await getActiveOffers();
  if (offers.length === 0) return products;

  const categoryExpansion = await buildCategoryExpansion(offers);

  return products.map((product) => {
    const plain = product.toObject ? product.toObject() : product;

    if (plain.discountEnabled) {
      // خصم يدوي موجود - له الأولوية القصوى، ما منلمسه
      return plain;
    }

    const matching = offers.filter((offer) =>
      offerMatchesProduct(offer, plain, categoryExpansion),
    );

    if (matching.length === 0) return plain;

    const best = matching.sort((a, b) => {
      const scopeDiff =
        SCOPE_PRIORITY[b.targetType] - SCOPE_PRIORITY[a.targetType];
      if (scopeDiff !== 0) return scopeDiff;
      return b.discountPercent - a.discountPercent;
    })[0];

    return {
      ...plain,
      effectivePrice: Math.round(
        plain.price * (1 - best.discountPercent / 100),
      ),
      appliedOffer: {
        id: best._id,
        title: best.title,
        discountPercent: best.discountPercent,
      },
    };
  });
};

module.exports = { attachEffectivePrice };

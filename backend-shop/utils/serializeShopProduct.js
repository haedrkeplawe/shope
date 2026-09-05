const { resolveLabel } = require("./resolveFilterLabels");

/*
  utils/serializeShopProduct.js
  ------------------------------------------------------------------
  منطق تجهيز منتج (أو منتجات) لواجهة المتجر (الزبون)

  فيه دالتين:
  1) serializeShopProduct   → شكل "كارت" مختصر (جديدنا، المفضلة، منتجات ذات صلة...)
  2) serializeProductDetail → شكل "تفاصيل كاملة" لصفحة عرض منتج واحد فقط

  المتوقع بالدالتين: منتج مرّ مسبقًا على attachEffectivePrice (من applyOffers.js)
*/

/* -------------------- شكل الكارت المختصر -------------------- */
const serializeShopProduct = (p, labelMaps) => {
  let displayPrice = p.price;
  let originalPriceToShow = null;
  let discountPercent = null;

  if (p.discountEnabled && p.discountPercent) {
    // خصم يدوي - price أصلاً هو السعر النهائي الحقيقي (مش محسوب)
    discountPercent = p.discountPercent;
    originalPriceToShow = p.originalPrice || null;
  } else if (p.appliedOffer) {
    // خصم من عرض جماعي نشط - محسوب لحظيًا من applyOffers
    discountPercent = p.appliedOffer.discountPercent;
    displayPrice = p.effectivePrice;
    originalPriceToShow = p.price;
  }

  return {
    id: p._id,
    name: p.name,
    brand: resolveLabel(labelMaps.brand, p.brand) || "",
    image:
      p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url || null,
    price: displayPrice,
    originalPrice: originalPriceToShow,
    discountPercent,
    // شارة الحالة: "مميزة" لو المنتج معلّم Featured، وإلا حالة القطعة
    // الفعلية (condition) - مترجمة من القيمة الداخلية (value) للـ label
    badgeLabel: p.featured
      ? "مميزة"
      : resolveLabel(labelMaps.condition, p.condition),
    size: p.sizes?.[0] || null,
    singlePiece: p.quantity === 1,
  };
};

/*
  -------------------- شكل التفاصيل الكاملة (صفحة عرض المنتج) --------------------

  colorValues / sizeValues: مصفوفة "values" (بس النشطة/active) جاية مباشرة من
  موديل AdvancedFilter (key: "color" و"size") - بتترسل جاهزة من الكنترولر
  عشان الدالة هون تضل بس مسؤولة عن التنسيق (Formatting) مش عن الاستعلامات

  sizeScale: بنرجّع مقياس المقاسات الكامل (كل قيم فلتر "المقاس" النشطة)، وكل
  وحدة معلّمة available:true/false حسب إذا كانت من مقاسات القطعة الفعلية
  (product.sizes) - عشان الواجهة تقدر ترسم كل المقاسات وتعطّل يلي مش متوفر
  بهاي القطعة بالذات، بدل ما نرجع بس المقاسات المتاحة ونخسر السياق البصري
*/
const serializeProductDetail = (
  p,
  labelMaps,
  colorValues = [],
  sizeValues = [],
) => {
  let displayPrice = p.price;
  let originalPriceToShow = null;
  let discountPercent = null;

  if (p.discountEnabled && p.discountPercent) {
    discountPercent = p.discountPercent;
    originalPriceToShow = p.originalPrice || null;
  } else if (p.appliedOffer) {
    discountPercent = p.appliedOffer.discountPercent;
    displayPrice = p.effectivePrice;
    originalPriceToShow = p.price;
  }

  // الصورة المميزة (isPrimary) أول واحدة بالمصفوفة، والباقي بعدها بنفس ترتيبهم
  const images = [...(p.images || [])].sort(
    (a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0),
  );

  const colorMap = {};
  colorValues.forEach((v) => (colorMap[v.value] = v));
  const colors = (p.colors || []).map((c) => ({
    value: c,
    label: colorMap[c]?.label || c,
    colorHex: colorMap[c]?.colorHex || null,
  }));

  const productSizes = new Set(p.sizes || []);
  const sizeScale = sizeValues.map((v) => ({
    value: v.value,
    label: v.label,
    available: productSizes.has(v.value),
  }));

  // نرجّع القياسات بس لو فيه قيمة حقيقية واحدة عالأقل، وإلا null - عشان
  // الواجهة تعرف تخفي "دليل المقاسات" كليًا لو ما فيه قياسات مسجلة أصلاً
  const measurements = p.measurements || {};
  const hasMeasurements = Object.values(measurements).some(
    (v) => v !== null && v !== undefined,
  );

  return {
    id: p._id,
    name: p.name,
    brand: resolveLabel(labelMaps.brand, p.brand) || "",
    images: images.map((img) => ({
      url: img.url,
      isPrimary: img.isPrimary,
      tags: img.tags || [],
    })),
    // فيديو المنتج - isFile:true يعني ملف مرفوع فعليًا (قابل للتشغيل مباشرة)،
    // isFile:false يعني رابط خارجي بس (يوتيوب مثلاً)
    video: p.videoFile
      ? { url: p.videoFile, isFile: true }
      : p.videoUrl
      ? { url: p.videoUrl, isFile: false }
      : null,
    price: displayPrice,
    originalPrice: originalPriceToShow,
    discountPercent,
    badges: {
      featured: !!p.featured,
      limitedQuantity: p.quantity > 0 && p.quantity <= 3,
      soldOut: p.publishStatus === "sold" || p.quantity === 0,
      reserved: p.publishStatus === "reserved",
    },
    condition: resolveLabel(labelMaps.condition, p.condition),
    qualityRating: resolveLabel(labelMaps.quality_rating, p.qualityRating),
    colors,
    sizeScale,
    quantity: p.quantity,
    singlePiece: p.quantity === 1,
    viewsCount: p.viewsCount || 0,
    shortDescription: p.shortDescription || "",
    detailedDescription: p.detailedDescription || "",
    whySpecial: p.whySpecial || "",
    measurements: hasMeasurements ? measurements : null,
    fabric: {
      mainFabric: resolveLabel(labelMaps.fabric_type, p.mainFabric),
      fabricDensity: resolveLabel(labelMaps.fabric_density, p.fabricDensity),
      fabricElasticity: resolveLabel(
        labelMaps.fabric_elasticity,
        p.fabricElasticity,
      ),
      composition: p.fabricComposition || [],
    },
    careInstructions: p.careInstructions || [],
    // تقرير الفحص الديناميكي يلي دخّله الأدمن (عدد العناصر مش ثابت) - بيترسم
    // بالواجهة كل عنصر مع أيقونة حسب status (ok/defect)
    inspectionReport: (p.inspectionReport || []).map((item) => ({
      key: item.key,
      label: item.label,
      status: item.status,
      severity: item.severity,
      description: item.description || "",
    })),
  };
};

module.exports = { serializeShopProduct, serializeProductDetail };

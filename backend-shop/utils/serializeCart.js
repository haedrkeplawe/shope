const Product = require("../models/product");
const { attachEffectivePrice } = require("./applyOffers");
const { buildLabelMaps, resolveLabel } = require("./resolveFilterLabels");

/*
  utils/serializeCart.js
  ------------------------------------------------------------------
  بيبني شكل السلة الكامل (بنود + مجاميع) من مصفوفة cart الخام المخزّنة
  بحساب الزبون (customer.cart: [{productId, size, quantity, addedAt}])

  مبدأ أساسي (متوافق مع فلسفة applyOffers.js بالكامل): السعر ما بينخزنش
  أبدًا بالسلة - بيتحسب لحظيًا من بيانات المنتج الحقيقية كل مرة، عشان لو
  تغيّر السعر أو انتهى عرض أو اتوقف، السلة تعكس الواقع فورًا من غير ما
  نحتاج نحدّث أي بيانات قديمة يدويًا

  كمان بيعيد التحقق من الكمية المتوفرة فعليًا وقت كل قراءة - مهم جدًا
  بمنصة Resale لأن أغلب القطع نسخة وحدة، فممكن كمية تنخفض بعد ما الزبون
  ضافها لسلته (زبون تاني اشتراها، أو الأدمن بدّل حالتها) - لو صار تعديل
  تلقائي، الكنترولر يلي بينادي الدالة هون هو المسؤول يحفظه بالداتابيز
  (needsPersist / persistCart)

  ملاحظة عن المنتجات الغير متاحة (محذوفة/موقوفة/نافذة): ما بنشيلها من
  السلة تلقائيًا (غير المحذوفة نهائيًا) - بتضل ظاهرة للزبون بحالة واضحة
  لحد ما يقرر بنفسه يشيلها، وبتُستبعد من المجاميع (subtotal/total) طبعًا
*/

const getPrimaryImage = (product) =>
  product.images?.find((img) => img.isPrimary)?.url ||
  product.images?.[0]?.url ||
  null;

const buildCartResult = async (rawCart = []) => {
  const productIds = rawCart.map((item) => item.productId);

  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = {};
  products.forEach((p) => (productsById[p._id.toString()] = p));

  const withPricing = await attachEffectivePrice(products);
  const pricingById = {};
  withPricing.forEach((p) => (pricingById[p._id.toString()] = p));

  const labelMaps = await buildLabelMaps(["condition", "brand"]);

  const items = [];
  const persistCart = [];
  let needsPersist = false;

  let subtotal = 0;
  let totalOriginal = 0;
  let shippingTotal = 0;
  let totalQuantity = 0;

  for (const line of rawCart) {
    const pid = line.productId.toString();
    const rawProduct = productsById[pid];

    if (!rawProduct) {
      // المنتج اتحذف نهائيًا من النظام - نستبعده من السلة المحفوظة تلقائيًا،
      // بس منعرضه بالاستجابة الحالية مرة أخيرة عشان الواجهة توضّح للزبون
      needsPersist = true;
      items.push({
        productId: pid,
        available: false,
        unavailableReason: "not_found",
        name: null,
        brand: "",
        image: null,
        size: line.size,
        quantity: line.quantity,
      });
      continue;
    }

    const outOfStock = rawProduct.quantity === 0;
    const isPublished = rawProduct.publishStatus === "published";

    if (!isPublished || outOfStock) {
      // المنتج لسه موجود بس مش متاح للشراء حاليًا (نفذ أو اتوقف نشره) -
      // بيضل بالسلة كما هو لحد ما الزبون يشيله بنفسه بوعي
      persistCart.push(line);
      items.push({
        productId: pid,
        available: false,
        unavailableReason:
          rawProduct.publishStatus === "sold" || outOfStock
            ? "sold"
            : "unpublished",
        name: rawProduct.name,
        brand: resolveLabel(labelMaps.brand, rawProduct.brand) || "",
        image: getPrimaryImage(rawProduct),
        size: line.size,
        quantity: line.quantity,
      });
      continue;
    }

    // منتج منشور ومتوفر فعليًا - نتأكد الكمية المطلوبة ما تتخطى المتوفر
    let quantity = line.quantity;
    let quantityAdjusted = false;
    if (quantity > rawProduct.quantity) {
      quantity = rawProduct.quantity;
      quantityAdjusted = true;
      needsPersist = true;
    }

    const priced = pricingById[pid];
    let displayPrice = priced.price;
    let originalPriceToShow = null;
    let discountPercent = null;

    if (priced.discountEnabled && priced.discountPercent) {
      discountPercent = priced.discountPercent;
      originalPriceToShow = priced.originalPrice || null;
    } else if (priced.appliedOffer) {
      discountPercent = priced.appliedOffer.discountPercent;
      displayPrice = priced.effectivePrice;
      originalPriceToShow = priced.price;
    }

    const shippingUnit = rawProduct.freeShipping
      ? 0
      : rawProduct.shippingPrice || 0;
    const lineTotal = displayPrice * quantity;

    subtotal += lineTotal;
    totalOriginal += (originalPriceToShow || displayPrice) * quantity;
    shippingTotal += shippingUnit * quantity;
    totalQuantity += quantity;

    persistCart.push({
      productId: rawProduct._id,
      size: line.size,
      quantity,
      addedAt: line.addedAt,
    });

    items.push({
      productId: pid,
      available: true,
      unavailableReason: null,
      name: rawProduct.name,
      brand: resolveLabel(labelMaps.brand, rawProduct.brand) || "",
      image: getPrimaryImage(rawProduct),
      condition: resolveLabel(labelMaps.condition, rawProduct.condition),
      size: line.size,
      quantity,
      quantityAdjusted,
      maxQuantity: rawProduct.quantity,
      price: displayPrice,
      originalPrice: originalPriceToShow,
      discountPercent,
      shippingPrice: shippingUnit,
      lineTotal,
    });
  }

  return {
    items,
    totals: {
      itemsCount: items.filter((i) => i.available).length,
      totalQuantity,
      subtotal,
      totalOriginal,
      totalSavings: Math.max(0, totalOriginal - subtotal),
      shippingTotal,
      grandTotal: subtotal + shippingTotal,
    },
    needsPersist,
    persistCart,
  };
};

module.exports = { buildCartResult };

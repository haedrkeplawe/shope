const Product = require("../models/product");
const { attachEffectivePrice } = require("./applyOffers");
const {
  buildLabelMaps,
  buildColorMap,
  resolveLabel,
} = require("./resolveFilterLabels");

/*
  utils/serializeCart.js
  ------------------------------------------------------------------
  بيبني شكل السلة الكامل (بنود + مجاميع) من مصفوفة cart الخام المخزّنة
  بحساب الزبون (customer.cart: [{_id, productId, size, color, quantity, addedAt}])

  مبدأ أساسي (متوافق مع فلسفة applyOffers.js بالكامل): السعر ما بينخزنش
  أبدًا بالسلة - بيتحسب لحظيًا من بيانات المنتج الحقيقية كل مرة، عشان لو
  تغيّر السعر أو انتهى عرض أو اتوقف، السلة تعكس الواقع فورًا من غير ما
  نحتاج نحدّث أي بيانات قديمة يدويًا

  كمان بيعيد التحقق من الكمية المتوفرة فعليًا وقت كل قراءة - مهم جدًا
  بمنصة Resale لأن أغلب القطع نسخة وحدة، فممكن كمية تنخفض بعد ما الزبون
  ضافها لسلته (زبون تاني اشتراها، أو الأدمن بدّل حالتها) - لو صار تعديل
  تلقائي، الكنترولر يلي بينادي الدالة هون هو المسؤول يحفظه بالداتابيز
  (needsPersist / persistCart)

  ⚠️ ملاحظة جوهرية (مقاس/لون منفصلين، مخزون مشترك): بقى ممكن يكون فيه
  أكتر من سطر بالسلة لنفس المنتج بالضبط (مقاس مختلف و/أو لون مختلف) -
  كل سطر بيترسم لحاله بالكامل (id مستقل، كمية مستقلة). بس المخزون
  (Product.quantity) مشترك بين كل هالأسطر مع بعض (نفس فلسفة الموديل) -
  فمجموع كمياتهم مع بعض ما بيتخطى أبدًا الكمية الفعلية المتوفرة بالمنتج،
  حتى لو كل سطر لحاله شكله متوفر

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
  const colorMap = await buildColorMap();

  // مجموع الكمية الخام (كما هي مطلوبة من الزبون، قبل أي تصحيح) لكل منتج
  // عبر كل أسطره (بمختلف المقاسات/الألوان) - أساس حساب سقف المخزون
  // المشترك لكل سطر بالأسفل
  const rawQtyByProduct = {};
  rawCart.forEach((line) => {
    const pid = line.productId.toString();
    rawQtyByProduct[pid] = (rawQtyByProduct[pid] || 0) + line.quantity;
  });

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
    const colorInfo = line.color ? colorMap[line.color] : null;
    const colorLabel = line.color ? colorInfo?.label || line.color : null;
    const colorHex = colorInfo?.colorHex || null;

    if (!rawProduct) {
      // المنتج اتحذف نهائيًا من النظام - نستبعده من السلة المحفوظة تلقائيًا،
      // بس منعرضه بالاستجابة الحالية مرة أخيرة عشان الواجهة توضّح للزبون
      needsPersist = true;
      items.push({
        id: line._id.toString(),
        productId: pid,
        available: false,
        unavailableReason: "not_found",
        name: null,
        brand: "",
        image: null,
        size: line.size,
        color: line.color,
        colorLabel,
        colorHex,
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
        id: line._id.toString(),
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
        color: line.color,
        colorLabel,
        colorHex,
        quantity: line.quantity,
      });
      continue;
    }

    // منتج منشور ومتوفر فعليًا - نتأكد مجموع كل الأسطر التابعة لنفس المنتج
    // (بمختلف المقاس/اللون) ما يتخطى الكمية الفعلية المتوفرة (مخزون مشترك)
    const otherLinesRawQty = rawQtyByProduct[pid] - line.quantity;
    const maxForThisLine = Math.max(0, rawProduct.quantity - otherLinesRawQty);

    let quantity = line.quantity;
    let quantityAdjusted = false;
    if (quantity > maxForThisLine) {
      quantity = maxForThisLine;
      quantityAdjusted = true;
      needsPersist = true;
    }

    // سقف الستيبر بواجهة السلة لهاد السطر بالذات: كميته الحالية + أي فاضل
    // من المخزون المشترك بعد حساب طلب كل الأسطر التانية لنفس المنتج
    const leftoverPoolForProduct = Math.max(
      0,
      rawProduct.quantity - rawQtyByProduct[pid],
    );
    const maxQuantity = quantity + leftoverPoolForProduct;

    if (quantity === 0) {
      // نادر جدًا: المخزون المشترك خلص كليًا بين باقي الأسطر التانية لنفس
      // المنتج - بيضل السطر ظاهر بس بحالة "غير متاح" بدل ما يختفي بصمت
      persistCart.push(line);
      items.push({
        id: line._id.toString(),
        productId: pid,
        available: false,
        unavailableReason: "sold",
        name: rawProduct.name,
        brand: resolveLabel(labelMaps.brand, rawProduct.brand) || "",
        image: getPrimaryImage(rawProduct),
        size: line.size,
        color: line.color,
        colorLabel,
        colorHex,
        quantity: line.quantity,
      });
      continue;
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
      _id: line._id,
      productId: rawProduct._id,
      size: line.size,
      color: line.color,
      quantity,
      addedAt: line.addedAt,
    });

    items.push({
      id: line._id.toString(),
      productId: pid,
      available: true,
      unavailableReason: null,
      name: rawProduct.name,
      brand: resolveLabel(labelMaps.brand, rawProduct.brand) || "",
      image: getPrimaryImage(rawProduct),
      condition: resolveLabel(labelMaps.condition, rawProduct.condition),
      size: line.size,
      color: line.color,
      colorLabel,
      colorHex,
      quantity,
      quantityAdjusted,
      maxQuantity,
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

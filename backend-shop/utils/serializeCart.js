const Product = require("../models/product");
const { attachEffectivePrice } = require("./applyOffers");
const { evaluateCoupon } = require("./couponEngine");
const { evaluateMembership } = require("./membershipEngine");
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
  نحتاج نحدّث أي بيانات قديمة يدويًا. نفس المبدأ بالضبط منطبق على الكوبون
  (appliedCouponCode) - بيتحقق من صلاحيته من جديد عبر utils/couponEngine.js
  كل مرة تُقرأ فيها السلة، مش بس لحظة "التطبيق"

  ⚠️ تحديث نظام الشحن: السلة ما عادت تحسب أو تعرض أي "شحن" أبدًا - سعر
  الشحن بقى معتمد على منطقة/مدينة التوصيل يلي الزبون بيختارها بصفحة
  الدفع (مش معروفة أصلاً وقت عرض السلة)، فبيتحسب فقط هناك وبيتثبّت نهائيًا
  لحظة تحويل السلة لطلب فعلي (utils/shippingEngine.js من controllers/
  order.controller.js). لهيك grandTotal هون = subtotal بعد خصم الكوبون
  بس، من غير أي مكوّن شحن - الفرونت (صفحة السلة) بيوضح للزبون إنه رسوم
  الشحن بتُحسب بالخطوة الجاية

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

/*
  options.customerId: مطلوب عشان نتحقق من حد الاستخدام لكل زبون بالكوبون
  options.appliedCouponCode: كود الكوبون المطبّق حاليًا (customer.appliedCoupon)
*/
const buildCartResult = async (rawCart = [], options = {}) => {
  const { customerId = null, appliedCouponCode = null } = options;

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

    const lineTotal = displayPrice * quantity;

    subtotal += lineTotal;
    totalOriginal += (originalPriceToShow || displayPrice) * quantity;
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
      lineTotal,
      ratingAverage: rawProduct.ratingAverage || 0,
      ratingCount: rawProduct.ratingCount || 0,
    });
  }

  // -------------------- الكوبون (فوق الـ subtotal، بعد كل العروض) --------------------
  // بيتحقق من صلاحيته من جديد كل مرة (مش بس لحظة "التطبيق") - لو ما عاد
  // صالح (اتوقف/انتهى/ما عاد المجموع كافي بعد ما الزبون شال قطعة...)
  // بنرجّع clearCoupon=true عشان الكنترولر يمسحه من حساب الزبون تلقائيًا
  let couponCode = null;
  let couponType = null;
  let couponDiscount = 0;
  let clearCoupon = false;
  let couponMessage = null;

  if (appliedCouponCode) {
    const evaluation = await evaluateCoupon({
      code: appliedCouponCode,
      customerId,
      subtotal,
    });

    if (evaluation.valid) {
      couponCode = evaluation.coupon.code;
      couponType = evaluation.coupon.type;
      couponDiscount = evaluation.discountAmount;
    } else {
      clearCoupon = true;
      couponMessage = evaluation.message;
    }
  }

  // ⚠️ بلا أي مكوّن شحن هون عن قصد - شوف شرح الملف فوق. رسوم الشحن
  // الفعلية بتنحسب وتنعرض بصفحة الدفع بس، بعد ما الزبون يختار مدينته
  //
  // -------------------- عضوية الولاء (مستقلة كليًا عن الكوبون) --------------------
  // بتتحسب وبتتطبق تلقائيًا حسب باقة الزبون بمجرد تحقق شرط الحد الأدنى،
  // بغض النظر عن وجود كوبون مطبّق من عدمه - شوف شرح كامل بـ
  // utils/membershipEngine.js. freeShipping هون معلوماتي بس (shippingPrice
  // مش معروف لسه بمرحلة السلة) - الحسم النهائي الملزم بيصير وقت تثبيت
  // الطلب فعليًا (controllers/order.controller.js)
  const membershipResult = await evaluateMembership({ customerId, subtotal });
  const membershipDiscount = membershipResult.discountAmount;

  const grandTotal = Math.max(
    0,
    subtotal - couponDiscount - membershipDiscount,
  );

  return {
    items,
    totals: {
      itemsCount: items.filter((i) => i.available).length,
      totalQuantity,
      subtotal,
      totalOriginal,
      totalSavings: Math.max(0, totalOriginal - subtotal),
      couponCode,
      couponType,
      couponDiscount,
      membershipTierName:
        membershipResult.tier.tierKey !== "free"
          ? membershipResult.tier.displayName
          : null,
      membershipDiscount,
      membershipFreeShippingEligible: membershipResult.freeShipping,
      grandTotal,
    },
    needsPersist,
    persistCart,
    clearCoupon,
    couponMessage,
  };
};

module.exports = { buildCartResult };

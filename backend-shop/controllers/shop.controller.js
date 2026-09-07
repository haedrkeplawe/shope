// user
const mongoose = require("mongoose");
const Product = require("../models/product");
const Category = require("../models/category");
const AdvancedFilter = require("../models/advancedFilter");
const Rating = require("../models/rating");
const ShippingZone = require("../models/shippingZone");
const { attachEffectivePrice } = require("../utils/applyOffers");
const { formatDurationLabel } = require("../utils/shippingEngine");
const { buildLabelMaps } = require("../utils/resolveFilterLabels");
const {
  serializeShopProduct,
  serializeProductDetail,
} = require("../utils/serializeShopProduct");

/*
  shop.controller.js
  - أول كنترولر لواجهة المتجر الفعلية للزبون (مش أدمن) - بيقرأ منتجات
    حقيقية من نفس موديل Product يلي بناه الأدمن، وبيربط utils/applyOffers
    فعليًا لأول مرة (كانت جاهزة وغير مستخدمة)
*/

/*
  آخر 4 منتجات منشورة فعليًا بترتيب الأحدث - بحد أقصى 4، أقل لو مش موجود
  GET /api/shop/new-arrivals
*/
exports.getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({ publishStatus: "published" })
      .sort({ createdAt: -1 })
      .limit(4);

    const withPricing = await attachEffectivePrice(products);

    // خرائط ترجمة القيم الداخلية (condition, brand) لأسماء العرض الحقيقية
    // - جلب واحد بس لكل الطلب، مش لكل منتج
    const labelMaps = await buildLabelMaps(["condition", "brand"]);

    const serialized = withPricing.map((p) =>
      serializeShopProduct(p, labelMaps),
    );

    return res.status(200).json({ products: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  الأقسام الرئيسية النشطة بس (بدون الفئات الفرعية، وبدون "غير مصنف"
  النظامية) - بعدّاد منتجات تراكمي (منتجات القسم المباشرة + كل فئاته
  الفرعية سوا)، بنفس منطق getOverview بلوحة تحكم الأدمن بالضبط
  GET /api/shop/categories
*/
exports.getMainCategories = async (req, res) => {
  try {
    const mainCategories = await Category.find({
      parentId: null,
      status: "active",
      isSystem: { $ne: true },
    }).sort({ order: 1 });

    const subCategories = await Category.find({
      parentId: { $ne: null },
    }).select("parentId");

    const productCounts = await Product.aggregate([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    productCounts.forEach((p) => {
      if (p._id) countMap[p._id.toString()] = p.count;
    });

    const serialized = mainCategories.map((cat) => {
      const directCount = countMap[cat._id.toString()] || 0;
      const childrenIds = subCategories
        .filter((sub) => sub.parentId?.toString() === cat._id.toString())
        .map((sub) => sub._id.toString());
      const childrenCount = childrenIds.reduce(
        (sum, cid) => sum + (countMap[cid] || 0),
        0,
      );

      return {
        id: cat._id,
        name: cat.name,
        image: cat.image,
        productsCount: directCount + childrenCount,
      };
    });

    return res.status(200).json({ categories: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  ⚠️ تحديث نظام الشحن: قائمة مناطق/مدن الشحن الفعالة - يستخدمها الزبون
  بصفحة الدفع (Checkout) لاختيار مدينته مباشرة (مش "منطقة" - المنطقة
  مجرد تجميع داخلي بالأدمن) وبيّرجع معاها سعر الشحن ومدته لكل منطقة
  عشان الفرونت يقدر يعرض معاينة فورية لحظة الاختيار. السعر النهائي
  الملزم بيتحسب ويتحقق منه من جديد وقت تأكيد الطلب فعليًا (شوف
  controllers/order.controller.js + utils/shippingEngine.js) - هاد
  الـ endpoint للعرض والمعاينة بس
  GET /api/shop/shipping-zones
*/
exports.getShippingZones = async (req, res) => {
  try {
    const zones = await ShippingZone.find({ isActive: true }).sort({
      order: 1,
      name: 1,
    });

    const serialized = zones.map((zone) => ({
      id: zone._id,
      name: zone.name,
      cities: zone.cities,
      price: zone.price,
      freeShippingThreshold: zone.freeShippingThreshold,
      durationLabel: formatDurationLabel(zone),
    }));

    return res.status(200).json({ zones: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تفاصيل منتج واحد كاملة - لصفحة عرض المنتج
  GET /api/shop/products/:id

  - بيرجّع فقط المنتجات بحالة "published" أو "reserved" أو "sold" - هاي
    الحالات الثلاثة يلي ممكن الزبون يوصلها لصفحتها فعليًا (من كارت بالموقع،
    من المفضلة، أو رابط قديم محفوظ) وبيستاهلوا صفحة كاملة (مع توضيح إنها
    محجوزة/مباعة بالواجهة) بدل 404. أي حالة داخلية تانية (مسودة، قيد
    الفحص، قيد التصوير، مخفي) بترجع 404 وكأنها مش موجودة أصلاً
*/
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const product = await Product.findOne({
      _id: id,
      publishStatus: { $in: ["published", "reserved", "sold"] },
    });

    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    // عداد مشاهدات حقيقي: كل زبون بيتحسب مرة وحدة بالضبط، مهما فتح صفحة
    // المنتج كتير مرات - بنتأكد أول اذا الزبون الحالي أصلاً موجود بقائمة
    // viewedBy، ولو لأ منزود العداد ونضيفه للقائمة بعملية واحدة atomic (شرط
    // الفلتر viewedBy:{$ne} نفسه بيمنع أي تكرار حتى لو صارت طلبات متزامنة)
    const alreadyViewed = product.viewedBy?.some(
      (customerId) => customerId.toString() === req.customerAuth.id,
    );

    if (!alreadyViewed) {
      product.viewsCount = (product.viewsCount || 0) + 1; // تحديث فوري بالنسخة الحالية عشان الريسبونس يطلع صحيح فورًا
      Product.updateOne(
        { _id: id, viewedBy: { $ne: req.customerAuth.id } },
        {
          $addToSet: { viewedBy: req.customerAuth.id },
          $inc: { viewsCount: 1 },
        },
      ).catch(() => {});
    }

    const [withPricing] = await attachEffectivePrice([product]);

    const labelMaps = await buildLabelMaps([
      "brand",
      "condition",
      "quality_rating",
      "fabric_type",
      "fabric_density",
      "fabric_elasticity",
    ]);

    const [colorFilter, sizeFilter] = await Promise.all([
      AdvancedFilter.findOne({ key: "color" }),
      AdvancedFilter.findOne({ key: "size" }),
    ]);

    const colorValues = (colorFilter?.values || []).filter((v) => v.active);
    const sizeValues = (sizeFilter?.values || []).filter((v) => v.active);

    const detail = serializeProductDetail(
      withPricing,
      labelMaps,
      colorValues,
      sizeValues,
    );

    return res.status(200).json({ product: detail });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  منتجات "ذات صلة" (قد يعجبك أيضًا) - بحد أقصى 4:
  1) أولوية أولى: منتجات من نفس الفئة الفرعية بالضبط يلي فيها المنتج الحالي
  2) لو مش كفاية (أو المنتج أصلاً مش تابع لفئة فرعية): نوسّع لكل القسم
     الرئيسي (الفئة الفرعية + كل الفئات الشقيقة التابعة لنفس القسم)
  3) لو ولا هيك لقينا شي: بنرجع مصفوفة فاضية (بدون أي fallback تاني زي البراند)
  GET /api/shop/products/:id/related
*/
exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const LIMIT = 4;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const current = await Product.findById(id).select("categoryId");
    if (!current) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    let related = [];

    if (current.categoryId) {
      const currentCategory = await Category.findById(current.categoryId);

      if (currentCategory?.parentId) {
        // المنتج تابع لفئة فرعية فعليًا - أول أولوية: نفس الفئة الفرعية
        related = await Product.find({
          _id: { $ne: id },
          publishStatus: "published",
          categoryId: currentCategory._id,
        }).limit(LIMIT);

        if (related.length < LIMIT) {
          // مش كفاية - نكمّل من كل القسم الرئيسي (الفئة الفرعية الحالية +
          // باقي الفئات الشقيقة التابعة لنفس القسم، سوا)
          const siblingSubs = await Category.find({
            parentId: currentCategory.parentId,
          }).select("_id");
          const categoryIds = [
            currentCategory.parentId,
            ...siblingSubs.map((c) => c._id),
          ];
          const excludeIds = [id, ...related.map((p) => p._id.toString())];

          const extra = await Product.find({
            _id: { $nin: excludeIds },
            publishStatus: "published",
            categoryId: { $in: categoryIds },
          }).limit(LIMIT - related.length);

          related = related.concat(extra);
        }
      } else if (currentCategory) {
        // المنتج تابع لقسم رئيسي مباشرة (مفيش فئة فرعية) - منبدأ مباشرة
        // من مستوى القسم الرئيسي (نفسه + كل فئاته الفرعية)
        const subs = await Category.find({
          parentId: currentCategory._id,
        }).select("_id");
        const categoryIds = [currentCategory._id, ...subs.map((c) => c._id)];

        related = await Product.find({
          _id: { $ne: id },
          publishStatus: "published",
          categoryId: { $in: categoryIds },
        }).limit(LIMIT);
      }
    }

    const withPricing = await attachEffectivePrice(related);
    const labelMaps = await buildLabelMaps(["condition", "brand"]);
    const serialized = withPricing.map((p) =>
      serializeShopProduct(p, labelMaps),
    );

    return res.status(200).json({ products: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  -------------------- التقييمات (Ratings) --------------------
  نجوم + تعليق نصي اختياري - تقييم واحد بالضبط لكل زبون لكل منتج. لو
  الزبون قيّم القطعة قبل هيك، هاي العملية بتعتبر "إعادة تقييم" (تحديث
  لنفس التقييم القديم) مش تقييم إضافي جديد - findOneAndUpdate بـ
  upsert:true هو يلي بيضمن هيك (لو مفيش تقييم سابق بينشئ واحد، ولو موجود
  بيعدّله)، والـ index الفريد بموديل Rating هو الضمانة النهائية على
  مستوى الداتابيز
*/

/*
  إضافة تقييم جديد أو تعديل تقييم موجود أصلاً لنفس الزبون على نفس المنتج -
  التعليق النصي (comment) اختياري بالكامل، النجوم (value) هي الإلزامية.
  بعد كل عملية بنعيد حساب متوسط التقييمات وعددها الكامل للمنتج ونخزنهم
  Cache بمستند المنتج نفسه (ratingAverage/ratingCount) عشان قراءة صفحة
  المنتج تضل سريعة (بدون aggregation كامل بكل مرة فتح)
  POST /api/shop/products/:id/rating   body: { value, comment }
*/
exports.submitRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, comment = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const numericValue = Number(value);
    const isValidValue =
      Number.isFinite(numericValue) &&
      numericValue >= 0.5 &&
      numericValue <= 5 &&
      Number.isInteger(numericValue * 2);

    if (!isValidValue) {
      return res.status(400).json({
        message:
          "قيمة التقييم لازم تكون بين نصف نجمة و5 نجوم (بخطوات نصف نجمة)",
      });
    }

    const trimmedComment = (comment || "").trim().slice(0, 500);

    const product = await Product.findOne({
      _id: id,
      publishStatus: { $in: ["published", "reserved", "sold"] },
    }).select("_id");

    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    // upsert:true → لو الزبون قيّم هاي القطعة قبل هيك بيتعدّل تقييمه
    // وتعليقه القديمين (إعادة تقييم)، ولو أول مرة بينشئ سطر جديد - نفس
    // السطر بالضبط دايمًا لكل تركيبة (منتج + زبون)، أبدًا مش سطرين
    //
    // ⚠️ approvalStatus: "pending" بترجّع صراحة بكل مرة (سواء تقييم جديد
    // أو إعادة تقييم) - أي تقييم أو تعديل عليه لازم يمر على موافقة الأدمن
    // من صفحة "التقييمات والتعليقات" من جديد قبل ما يظهر بقائمة "آراء
    // الزبائن" العامة أو يدخل بحساب متوسط التقييمات (شوف موديل Rating)
    const savedRating = await Rating.findOneAndUpdate(
      { productId: id, customerId: req.customerAuth.id },
      {
        $set: {
          value: numericValue,
          comment: trimmedComment,
          approvalStatus: "pending",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // متوسط/عدد التقييمات المخزّنة Cache بالمنتج بتنحسب من التقييمات
    // المعتمدة (approved) بس - عشان ما يتأثر العرض العام بتقييم لسه ما
    // شافه الأدمن
    const [stats] = await Rating.aggregate([
      { $match: { productId: product._id, approvalStatus: "approved" } },
      { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
    ]);

    const ratingAverage = stats ? Math.round(stats.avg * 10) / 10 : 0;
    const ratingCount = stats ? stats.count : 0;

    await Product.updateOne(
      { _id: id },
      { $set: { ratingAverage, ratingCount } },
    );

    return res.status(200).json({
      message: "تم إرسال تقييمك بنجاح، سيظهر للعامة بعد مراجعة الإدارة",
      myRating: numericValue,
      myComment: savedRating.comment || "",
      ratingAverage,
      ratingCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Race Condition نادر جدًا (طلبين متزامنين بنفس اللحظة بالضبط) -
      // الـ index الفريد رفض الإدخال. برجّع رسالة عامة وبنطلب من الزبون
      // يعيد المحاولة، بدل ما نرجّع خطأ سيرفر مبهم
      return res
        .status(409)
        .json({ message: "حصل تعارض بسيط، الرجاء إعادة المحاولة" });
    }
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0]?.message;
      return res
        .status(400)
        .json({ message: firstError || "بيانات التقييم غير صالحة" });
    }
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تقييم الزبون الحالي لهاي القطعة بالذات (لو قيّمها قبل هيك) - تُستخدم
  لتعبئة الودجت بقيمته وتعليقه القديمين تلقائيًا وقت فتح الصفحة، عشان
  يعرف فورًا إنه أي تعديل جاي هو "إعادة تقييم" مش تقييم جديد
  GET /api/shop/products/:id/rating/me
*/
exports.getMyRating = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const rating = await Rating.findOne({
      productId: id,
      customerId: req.customerAuth.id,
    }).select("value comment");

    return res.status(200).json({
      myRating: rating ? rating.value : null,
      myComment: rating ? rating.comment || "" : "",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  قائمة "آراء الزبائن" الكاملة لمنتج معيّن (الأحدث أولًا) - بترجع اسم
  الزبون + نجومه + تعليقه (لو كتب واحد) + تاريخ التقييم. بحد أقصى 20
  تقييم (الأحدث) لتفادي إثقال الصفحة - مفيش صفحات (Pagination) حاليًا،
  نفس فلسفة "منتجات ذات صلة" المحدودة بـ4 بكل الموقع
  GET /api/shop/products/:id/rating/list
*/
exports.getProductRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const LIMIT = 20;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    // بيظهر بالقائمة العامة: أي تقييم معتمد (approved) من الأدمن + تقييم
    // الزبون الحالي نفسه دايمًا (حتى لو لسه قيد المراجعة أو مرفوض) عشان
    // يشوف تقييمه هو نفسه بأي حالة، بس ما حدا غيره يشوف تقييمات لسه ما
    // وافق عليها الأدمن
    const ratings = await Rating.find({
      productId: id,
      $or: [
        { approvalStatus: "approved" },
        { customerId: req.customerAuth.id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .populate("customerId", "fullName");

    const myId = req.customerAuth.id.toString();
    const reviews = ratings.map((r) => ({
      id: r._id,
      customerName: r.customerId?.fullName || "زبون طراز",
      value: r.value,
      comment: r.comment || "",
      createdAt: r.createdAt,
      isMine: r.customerId?._id?.toString() === myId,
    }));

    return res.status(200).json({ reviews });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  ==================================================================
  -------------------- صفحة المتجر الكاملة (تصفح كل المنتجات) --------------------
  ==================================================================
  هاي هي الصفحة الموحّدة يلي بترتاد إلها كل روابط الموقع (المتجر،
  البراندات، جديدنا، العروض، عرض الكل بأي سلايدر بالرئيسية...) - كل
  رابط بيوصلها بفلتر افتراضي مختلف (شغلة الفرونت إند)، بس الطلب نفسه
  لهاي الكنترولرات دايمًا. لهيك لازم تكون شاملة ومرنة بما فيه الكفاية
  تستوعب أي تركيبة فلاتر جاية من أي مكان بالموقع
*/

// المفاتيح المسموح فلترتها ديناميكيًا عن طريق موديل AdvancedFilter - كل
// مفتاح مربوط بحقله بموديل Product عن طريق productField (نفس الربط يلي
// بيستخدمه الأدمن بالضبط بصفحة "الفلاتر المتقدمة") - أي فلتر أو قيمة
// جديدة يضيفها الأدمن بتنعكس هون تلقائيًا بدون أي تعديل كود
const DYNAMIC_FILTER_KEYS = [
  "gender",
  "color",
  "size",
  "brand",
  "condition",
  "quality_rating",
  "fabric_type",
  "fabric_density",
  "fabric_elasticity",
  "season",
  "piece_type",
];

/*
  توسيع فلتر الفئة: لو الفئة المختارة قسم رئيسي، بنشمل معه كل فئاته
  الفرعية تلقائيًا (نفس منطق buildCategoryExpansion بـ applyOffers.js
  وgetRelatedProducts فوق، بالضبط) - بيرجع null لو الفئة مش موجودة أصلاً
*/
const resolveCategoryIds = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) return null;

  if (!category.parentId) {
    const subCategories = await Category.find({
      parentId: category._id,
    }).select("_id");
    return [category._id, ...subCategories.map((c) => c._id)];
  }

  return [category._id];
};

/*
  بناء فلتر Mongo من الكويري سترنغ (كل الفلاتر "البنيوية" يلي ممكن تصير
  على مستوى الداتابيز مباشرة) - بيرجع null لو الفئة المطلوبة مش موجودة
  أصلاً (يعني أكيد النتيجة فاضية، ما في داعي نكمل الاستعلام)
*/
const buildProductFilter = async (query) => {
  const filter = { publishStatus: "published" };

  if (query.category) {
    if (!mongoose.Types.ObjectId.isValid(query.category)) return null;
    const categoryIds = await resolveCategoryIds(query.category);
    if (!categoryIds) return null;
    filter.categoryId = { $in: categoryIds };
  }

  // خرائط key → productField لكل الفلاتر الديناميكية دفعة وحدة (طلب
  // واحد بس، مش طلب لكل فلتر)
  const dynamicDefs = await AdvancedFilter.find({
    key: { $in: DYNAMIC_FILTER_KEYS },
  }).select("key productField");
  const fieldByKey = {};
  dynamicDefs.forEach((d) => {
    fieldByKey[d.key] = d.productField;
  });

  DYNAMIC_FILTER_KEYS.forEach((key) => {
    const raw = query[key];
    const field = fieldByKey[key];
    if (!raw || !field) return;

    const values = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) return;

    // $in بتشتغل صح سوا على حقول نصية مفردة (brand, gender...) وحقول
    // مصفوفة (colors, sizes) - بتطابق أي عنصر بالمصفوفة مع أي قيمة مطلوبة
    filter[field] = { $in: values };
  });

  if (query.membersOnly === "1" || query.membersOnly === "true") {
    filter.membersOnly = true;
  }
  if (query.featured === "1" || query.featured === "true") {
    filter.featured = true;
  }
  if (query.isNew === "1" || query.isNew === "true") {
    filter.isNewArrival = true;
  }

  if (query.search && query.search.trim()) {
    const safeSearch = query.search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeSearch, "i");
    filter.$or = [{ name: regex }, { brand: regex }, { searchTags: regex }];
  }

  return filter;
};

// السعر المعروض فعليًا للزبون (بعد أي خصم) - effectivePrice موجودة بس
// عند المنتجات المؤهلة لعرض جماعي نشط (شوف utils/applyOffers.js)، وإلا
// السعر العادي المخزّن هو الصحيح أصلاً (يشمل حالة الخصم اليدوي كمان،
// لأنه فيها price هو أصلاً السعر النهائي بعد الخصم)
const getDisplayPrice = (p) => p.effectivePrice ?? p.price;

// هل المنتج عليه أي تخفيض فعّال حاليًا - خصم يدوي أو عرض جماعي نشط، سوا
// (نفس شرط serializeShopProduct بالضبط)
const isOnOffer = (p) =>
  Boolean((p.discountEnabled && p.discountPercent) || p.appliedOffer);

const sortCandidates = (list, sort) => {
  const arr = [...list];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
    case "price_desc":
      return arr.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    case "popular":
      return arr.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    case "top_rated":
      return arr.sort(
        (a, b) =>
          (b.ratingAverage || 0) - (a.ratingAverage || 0) ||
          (b.ratingCount || 0) - (a.ratingCount || 0),
      );
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

/*
  صفحة المتجر الكاملة - تصفح كل المنتجات مع فلترة/ترتيب/بحث/تقسيم صفحات
  GET /api/shop/products

  ⚠️ فلترة السعر (minPrice/maxPrice) وفلتر "عروض وتخفيضات" (onOffer)
  بتصير بعد جلب المنتجات المطابقة وحساب effectivePrice (utils/applyOffers)،
  مش على مستوى الداتابيز مباشرة - لأنه السعر الفعّال بعد الخصم محسوب
  لحظيًا مش مخزّن (نفس فلسفة applyOffers.js بالكامل). الترتيب بعد الفلترة
  الكاملة كمان بيصير بالذاكرة لنفس السبب (فرز حسب السعر الفعلي مش المخزّن)
*/
exports.getShopProducts = async (req, res) => {
  try {
    const {
      minPrice,
      maxPrice,
      onOffer,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const mongoFilter = await buildProductFilter(req.query);

    if (!mongoFilter) {
      return res.status(200).json({
        products: [],
        pagination: {
          page: 1,
          limit: Number(limit) || 12,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const rawProducts = await Product.find(mongoFilter);
    let candidates = await attachEffectivePrice(rawProducts);

    if (onOffer === "1" || onOffer === "true") {
      candidates = candidates.filter(isOnOffer);
    }

    const min =
      minPrice !== undefined && minPrice !== "" ? Number(minPrice) : null;
    const max =
      maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : null;
    if (
      (min !== null && !Number.isNaN(min)) ||
      (max !== null && !Number.isNaN(max))
    ) {
      candidates = candidates.filter((p) => {
        const displayPrice = getDisplayPrice(p);
        if (min !== null && !Number.isNaN(min) && displayPrice < min)
          return false;
        if (max !== null && !Number.isNaN(max) && displayPrice > max)
          return false;
        return true;
      });
    }

    const sorted = sortCandidates(candidates, sort);

    const total = sorted.length;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(48, Math.max(1, Number(limit) || 12));
    const start = (pageNum - 1) * limitNum;
    const pageItems = sorted.slice(start, start + limitNum);

    const labelMaps = await buildLabelMaps(["brand", "condition"]);
    const serialized = pageItems.map((p) => serializeShopProduct(p, labelMaps));

    return res.status(200).json({
      products: serialized,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  بيانات فلاتر صفحة المتجر دفعة وحدة (الفئات مع فئاتها الفرعية + نطاق
  السعر الفعلي بالمخزون + الفلاتر المتقدمة النشطة وقيمها + حالة فلاتر
  النظام) - عشان الفرونت يبني درج الفلاتر بالكامل من طلب واحد بس، وتضل
  الصفحة متكاملة مع تحكم الأدمن (نشط/مخفي، يظهر بالموبايل) بدل ما تكرر
  منطق منفصل. الفلاتر الفاضية (زي "الماركة" قبل ما الأدمن يضيف قيم)
  بتنحذف من القائمة تلقائيًا عشان ما نعرض قسم فاضي بالدرج
  GET /api/shop/filters
*/
exports.getShopFilters = async (req, res) => {
  try {
    const [mainCategories, subCategories, priceStats, advancedFilters] =
      await Promise.all([
        Category.find({
          parentId: null,
          status: "active",
          isSystem: { $ne: true },
        }).sort({ order: 1 }),
        Category.find({ parentId: { $ne: null }, status: "active" }).sort({
          order: 1,
        }),
        Product.aggregate([
          { $match: { publishStatus: "published" } },
          {
            $group: {
              _id: null,
              min: { $min: "$price" },
              max: { $max: "$price" },
            },
          },
        ]),
        AdvancedFilter.find({
          key: {
            $in: [...DYNAMIC_FILTER_KEYS, "discount_status", "members_only"],
          },
        }).sort({ order: 1 }),
      ]);

    const categories = mainCategories.map((main) => ({
      id: main._id,
      name: main.name,
      image: main.image,
      subCategories: subCategories
        .filter((s) => s.parentId?.toString() === main._id.toString())
        .map((s) => ({ id: s._id, name: s.name })),
    }));

    const priceRange = priceStats[0]
      ? { min: priceStats[0].min, max: priceStats[0].max }
      : { min: 0, max: 0 };

    // ⚠️ المعيار الوحيد لظهور الفلتر عند الزبون هو مفتاح "نشط" (active)
    // يلي بيتحكم فيه الأدمن من صفحة "الفلاتر المتقدمة" - طالما الأدمن
    // فعّله، لازم يظهر بالمتجر، حتى لو لسه ما انضافلّه قيم فعلية (زي
    // "الماركة" أول ما يتفعّل قبل ما الأدمن يضيف أي ماركة) - الفرونت
    // بيعرض رسالة "لا توجد قيم بعد" بدل ما يخفي القسم كليًا بهاي الحالة
    const filters = advancedFilters
      .filter((f) => DYNAMIC_FILTER_KEYS.includes(f.key) && f.active)
      .map((f) => ({
        key: f.key,
        displayName: f.displayName,
        isMultiValue: f.isMultiValue,
        searchable: f.searchable,
        values: f.values
          .filter((v) => v.active)
          .sort((a, b) => a.order - b.order)
          .map((v) => ({
            value: v.value,
            label: v.label,
            colorHex: v.colorHex || null,
          })),
      }));

    const discountStatusFilter = advancedFilters.find(
      (f) => f.key === "discount_status",
    );
    const membersOnlyFilter = advancedFilters.find(
      (f) => f.key === "members_only",
    );

    return res.status(200).json({
      categories,
      priceRange,
      filters,
      toggles: {
        onOffer: discountStatusFilter ? discountStatusFilter.active : false,
        membersOnly: membersOnlyFilter ? membersOnlyFilter.active : false,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

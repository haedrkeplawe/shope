// user
const mongoose = require("mongoose");
const Product = require("../models/product");
const Category = require("../models/category");
const AdvancedFilter = require("../models/advancedFilter");
const { attachEffectivePrice } = require("../utils/applyOffers");
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

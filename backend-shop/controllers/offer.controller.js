const Offer = require("../models/offer");
const Category = require("../models/category");
const Product = require("../models/product");

/*
  بيحسب حالة العرض المعروضة (نشط/مجدول/منتهي/متوقف) لحظيًا
  مش مخزّنة بالداتابيز عشان نتفادى تضارب البيانات لو حدا نسي يحدّثها
*/
const computeStatus = (offer) => {
  if (!offer.isActive) return "paused";
  const now = new Date();
  if (now < offer.startDate) return "scheduled";
  if (now > offer.endDate) return "expired";
  return "active";
};

/*
  وصف نصي مختصر لنطاق تطبيق العرض - يتعرض بعمود "التطبيق على" بالجدول
*/
const describeTarget = (offer) => {
  switch (offer.targetType) {
    case "all":
      return "جميع المنتجات";
    case "category":
      return offer.categoryId?.name
        ? `فئة: ${offer.categoryId.name}`
        : "فئة محددة";
    case "specific_products":
      return `${offer.productIds?.length || 0} منتج محدد`;
    case "new_customers":
      return "العملاء الجدد فقط";
    default:
      return "—";
  }
};

const serializeOffer = (offer) => ({
  id: offer._id,
  title: offer.title,
  discountPercent: offer.discountPercent,
  startDate: offer.startDate,
  endDate: offer.endDate,
  isActive: offer.isActive,
  status: computeStatus(offer),
  targetType: offer.targetType,
  targetLabel: describeTarget(offer),
  categoryId: offer.categoryId?._id || offer.categoryId || null,
  categoryName: offer.categoryId?.name || null,
  productIds: offer.productIds || [],
  usageCount: offer.usageCount,
  createdAt: offer.createdAt,
});

/*
  التحقق من صحة حقول التطبيق (targetType) حسب النوع المختار
*/
const validateTargetFields = async (body) => {
  const { targetType, categoryId, productIds } = body;

  if (
    !["all", "category", "specific_products", "new_customers"].includes(
      targetType,
    )
  ) {
    return "نوع تطبيق العرض غير صالح";
  }

  if (targetType === "category") {
    if (!categoryId) return "الفئة مطلوبة لهذا النوع من العروض";
    const category = await Category.findById(categoryId);
    if (!category) return "الفئة المحددة غير موجودة";
  }

  if (targetType === "specific_products") {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return "لازم تحدد منتج واحد على الأقل لهذا النوع من العروض";
    }
  }

  return null;
};

/*
  جلب كل العروض + إحصائيات الصفحة دفعة وحدة
  GET /api/offers
*/
exports.getOverview = async (req, res) => {
  try {
    const offers = await Offer.find({})
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    const serialized = offers.map(serializeOffer);

    const stats = {
      totalOffers: serialized.length,
      activeOffers: serialized.filter((o) => o.status === "active").length,
      scheduledOffers: serialized.filter((o) => o.status === "scheduled")
        .length,
      totalUsage: serialized.reduce((sum, o) => sum + (o.usageCount || 0), 0),
    };

    return res.status(200).json({ stats, offers: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب عرض واحد بالتفصيل (لملء فورم التعديل)
  GET /api/offers/:id
*/
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate(
      "categoryId",
      "name",
    );
    if (!offer) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }
    return res.status(200).json({ offer: serializeOffer(offer) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إنشاء عرض جديد
  POST /api/offers
*/
exports.createOffer = async (req, res) => {
  try {
    const { title, discountPercent, startDate, endDate, targetType } = req.body;

    if (!title || !discountPercent || !startDate || !endDate || !targetType) {
      return res.status(400).json({ message: "كل الحقول الأساسية مطلوبة" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "تاريخ الانتهاء لازم يكون بعد تاريخ البداية" });
    }

    const targetError = await validateTargetFields(req.body);
    if (targetError) {
      return res.status(400).json({ message: targetError });
    }

    const offer = await Offer.create({
      title,
      discountPercent: Number(discountPercent),
      startDate,
      endDate,
      targetType,
      categoryId: targetType === "category" ? req.body.categoryId : null,
      productIds: targetType === "specific_products" ? req.body.productIds : [],
    });

    const populated = await offer.populate("categoryId", "name");

    return res.status(201).json({
      message: "تم إنشاء العرض بنجاح",
      offer: serializeOffer(populated),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل عرض موجود
  PATCH /api/offers/:id
*/
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }

    const {
      title,
      discountPercent,
      startDate,
      endDate,
      targetType,
      categoryId,
      productIds,
    } = req.body;

    const finalStart = startDate || offer.startDate;
    const finalEnd = endDate || offer.endDate;
    if (new Date(finalStart) >= new Date(finalEnd)) {
      return res
        .status(400)
        .json({ message: "تاريخ الانتهاء لازم يكون بعد تاريخ البداية" });
    }

    if (targetType) {
      const targetError = await validateTargetFields({
        targetType,
        categoryId,
        productIds,
      });
      if (targetError) {
        return res.status(400).json({ message: targetError });
      }
      offer.targetType = targetType;
      offer.categoryId = targetType === "category" ? categoryId : null;
      offer.productIds = targetType === "specific_products" ? productIds : [];
    }

    if (title) offer.title = title;
    if (discountPercent) offer.discountPercent = Number(discountPercent);
    if (startDate) offer.startDate = startDate;
    if (endDate) offer.endDate = endDate;

    await offer.save();
    const populated = await offer.populate("categoryId", "name");

    return res
      .status(200)
      .json({
        message: "تم تحديث العرض بنجاح",
        offer: serializeOffer(populated),
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إيقاف / إعادة تفعيل عرض بسرعة من غير فتح فورم التعديل كامل
  PATCH /api/offers/:id/status
*/
exports.updateOfferActiveState = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "قيمة الحالة غير صالحة" });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }

    offer.isActive = isActive;
    await offer.save();
    const populated = await offer.populate("categoryId", "name");

    return res.status(200).json({
      message: isActive ? "تم تفعيل العرض" : "تم إيقاف العرض",
      offer: serializeOffer(populated),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف عرض
  DELETE /api/offers/:id
*/
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }
    await offer.deleteOne();
    return res.status(200).json({ message: "تم حذف العرض بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  خيارات مختصرة للمنتجات (id + name + sku) عشان تتعرض كخيارات اختيار متعدد
  بفورم "منتجات محددة" - بحث بسيط بالاسم لو ?search موجود
  GET /api/offers/product-options?search=...
*/
exports.getProductOptions = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = search ? { name: new RegExp(search, "i") } : {};

    const products = await Product.find(filter)
      .select("name sku price images")
      .limit(30)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        image:
          p.images?.find((img) => img.isPrimary)?.url ||
          p.images?.[0]?.url ||
          null,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

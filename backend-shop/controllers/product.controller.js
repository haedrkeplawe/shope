const Product = require("../models/product");
const Category = require("../models/category");
const cloudinary = require("../config/cloudinary");

const STORE_PREFIX = "TRZ";

const parseJSON = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

/*
  توليد رمز SKU تلقائيًا بالشكل: TRZ-<كود الفئة>-<رقم تسلسلي>
  - كود الفئة بياخده من حقل "code" في الفئة لو موجود، وإلا أول حرفين من اسمها
  - الرقم التسلسلي بيعتمد على عدد المنتجات الموجودة بنفس البادئة + 1
*/
const generateSkuValue = async (categoryId) => {
  let categoryCode = "GN";

  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (category) {
      categoryCode = category.code || category.name.slice(0, 2).toUpperCase();
    }
  }

  const prefix = `${STORE_PREFIX}-${categoryCode}-`;
  const count = await Product.countDocuments({
    sku: new RegExp(`^${prefix}`),
  });

  const sequence = String(count + 1).padStart(5, "0");
  return `${prefix}${sequence}`;
};

/*
  معاينة رمز SKU التالي (من غير حجزه فعليًا)
  GET /api/products/generate-sku?categoryId=...
*/
exports.getGeneratedSku = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const sku = await generateSkuValue(categoryId);
    return res.status(200).json({ sku });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب الماركات المستخدمة فعليًا في المنتجات (لعرضها كخيارات فلترة)
  GET /api/products/filter-options
*/
exports.getFilterOptions = async (req, res) => {
  try {
    const brands = await Product.distinct("brand");
    return res.status(200).json({
      brands: brands.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب قائمة المنتجات مع دعم فلاتر متقدمة
  GET /api/products
*/
exports.getProducts = async (req, res) => {
  try {
    const {
      search,
      pieceType,
      status,
      gender,
      brand,
      size,
      color,
      condition,
      priceMin,
      priceMax,
      hasVideo,
      hasDiscount,
      freeShipping,
      featured,
      isNew,
      categoryId,
      outOfStock,
    } = req.query;

    const filter = {};
    const andConditions = [];

    if (search) {
      const regex = new RegExp(search, "i");
      andConditions.push({
        $or: [
          { name: regex },
          { sku: regex },
          { brand: regex },
          { colors: regex },
        ],
      });
    }

    if (pieceType && pieceType !== "all") filter.pieceType = pieceType;
    if (status && status !== "all") filter.publishStatus = status;
    if (gender && gender !== "all") filter.gender = gender;
    if (brand && brand !== "all") filter.brand = brand;
    if (size && size !== "all") filter.sizes = size;
    if (color && color !== "all") filter.colors = color;
    if (condition && condition !== "all") filter.condition = condition;
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (category && !category.parentId) {
        // قسم رئيسي: هات منتجاته المباشرة + منتجات كل فئاته الفرعية
        const subIds = await Category.find({ parentId: categoryId }).distinct(
          "_id",
        );
        filter.categoryId = { $in: [categoryId, ...subIds] };
      } else {
        filter.categoryId = categoryId;
      }
    }

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }

    if (hasVideo === "true") {
      andConditions.push({
        $or: [{ videoUrl: { $ne: "" } }, { videoFile: { $ne: null } }],
      });
    }
    if (hasDiscount === "true") filter.discountEnabled = true;
    if (freeShipping === "true") filter.freeShipping = true;
    if (featured === "true") filter.featured = true;
    if (isNew === "true") filter.isNew = true;

    if (andConditions.length > 0) filter.$and = andConditions;

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      products,
      total: products.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب منتج واحد بالتفصيل (لصفحة التعديل أو المعاينة)
  GET /api/products/:id
*/
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "categoryId",
      "name parentId",
    );
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }
    return res.status(200).json({ product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إنشاء منتج جديد (كل خطوات الويزارد السبعة بيتبعتوا مع بعض)
  POST /api/products
  - بيانات نصية عادية كحقول FormData، والحقول المركّبة (ألوان، مقاسات، قياسات...)
    بتتبعت كـ JSON string ويتم تحليلها هنا
*/
exports.createProduct = async (req, res) => {
  try {
    const body = req.body;

    if (!body.name) {
      return res.status(400).json({ message: "اسم المنتج مطلوب" });
    }
    if (!body.price) {
      return res.status(400).json({ message: "سعر البيع مطلوب" });
    }

    const imageMeta = parseJSON(body.imageMeta, []);
    // file.path = رابط الصورة الكامل على Cloudinary، file.filename = الـ public_id
    const uploadedImages = (req.files?.images || []).map((file, index) => ({
      url: file.path,
      publicId: file.filename,
      tags: imageMeta[index]?.tags || [],
      isPrimary: imageMeta[index]?.isPrimary || false,
    }));

    // لو مفيش صورة معلّمة كرئيسية، خلي أول صورة هي الرئيسية تلقائيًا
    if (
      uploadedImages.length > 0 &&
      !uploadedImages.some((img) => img.isPrimary)
    ) {
      uploadedImages[0].isPrimary = true;
    }

    const videoFile = req.files?.video?.[0]?.path || null;
    const videoFilePublicId = req.files?.video?.[0]?.filename || null;

    let sku = body.sku?.trim();
    if (!sku) {
      sku = await generateSkuValue(body.categoryId);
    }

    const product = await Product.create({
      name: body.name,
      categoryId: body.categoryId || null,
      pieceType: body.pieceType || null,
      gender: body.gender || "unisex",
      brand: body.brand || "",
      season: body.season || null,
      colors: parseJSON(body.colors, []),
      sizes: parseJSON(body.sizes, []),
      condition: body.condition || null,
      sku,
      quantity: body.quantity ? Number(body.quantity) : 1,

      price: Number(body.price),
      costPrice: body.costPrice ? Number(body.costPrice) : null,
      originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
      shippingPrice: body.shippingPrice ? Number(body.shippingPrice) : 0,
      discountEnabled: body.discountEnabled === "true",
      freeShipping: body.freeShipping === "true",
      featured: body.featured === "true",
      isNew: body.isNew === "true",
      discountPercent: body.discountPercent
        ? Number(body.discountPercent)
        : null,
      discountEndDate: body.discountEndDate || null,

      images: uploadedImages,
      videoUrl: body.videoUrl || "",
      videoFile,
      videoFilePublicId,

      qualityRating: body.qualityRating || null,
      measurements: parseJSON(body.measurements, {}),
      buyerNote: body.buyerNote || "",

      mainFabric: body.mainFabric || null,
      fabricDensity: body.fabricDensity || null,
      fabricElasticity: body.fabricElasticity || null,
      seasonSuitability: body.seasonSuitability || null,
      fabricComposition: parseJSON(body.fabricComposition, []),
      careInstructions: parseJSON(body.careInstructions, []),

      inspectionReport: parseJSON(body.inspectionReport, []),

      shortDescription: body.shortDescription || "",
      detailedDescription: body.detailedDescription || "",
      whySpecial: body.whySpecial || "",
      seoTitle: body.seoTitle || "",
      seoDescription: body.seoDescription || "",
      searchTags: parseJSON(body.searchTags, []),

      publishStatus: body.publishStatus || "draft",
    });

    return res.status(201).json({ message: "تم إنشاء المنتج بنجاح", product });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "رمز SKU مستخدم بالفعل" });
    }
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل منتج موجود
  PATCH /api/products/:id
  - existingImages: القائمة النهائية للصور القديمة المطلوب الإبقاء عليها (بعد أي حذف/تعديل تصنيف)
  - أي ملفات جديدة في images بتتضاف في الآخر
*/
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    const textFields = [
      "name",
      "categoryId",
      "pieceType",
      "gender",
      "brand",
      "sku",
      "shortDescription",
      "detailedDescription",
      "whySpecial",
      "seoTitle",
      "seoDescription",
      "videoUrl",
      "mainFabric",
      "fabricDensity",
      "fabricElasticity",
      "seasonSuitability",
      "buyerNote",
      "condition",
      "qualityRating",
      "season",
      "publishStatus",
    ];
    textFields.forEach((field) => {
      if (body[field] !== undefined) product[field] = body[field] || null;
    });

    const numberFields = [
      "price",
      "costPrice",
      "originalPrice",
      "quantity",
      "discountPercent",
      "shippingPrice",
    ];
    numberFields.forEach((field) => {
      if (body[field] !== undefined) {
        product[field] = body[field] === "" ? null : Number(body[field]);
      }
    });

    const boolFields = ["discountEnabled", "freeShipping", "featured", "isNew"];
    boolFields.forEach((field) => {
      if (body[field] !== undefined) product[field] = body[field] === "true";
    });

    if (body.discountEndDate !== undefined) {
      product.discountEndDate = body.discountEndDate || null;
    }

    const jsonFieldsMap = {
      colors: "colors",
      sizes: "sizes",
      measurements: "measurements",
      fabricComposition: "fabricComposition",
      careInstructions: "careInstructions",
      inspectionReport: "inspectionReport",
      searchTags: "searchTags",
    };
    Object.entries(jsonFieldsMap).forEach(([bodyKey, modelKey]) => {
      if (body[bodyKey] !== undefined) {
        product[modelKey] = parseJSON(body[bodyKey], product[modelKey]);
      }
    });

    // الصور: القديمة (بعد أي تعديل/حذف من الفرونت) + أي صور جديدة مرفوعة
    if (body.existingImages !== undefined) {
      const keptImages = parseJSON(body.existingImages, product.images);
      const keptPublicIds = keptImages
        .map((img) => img.publicId)
        .filter(Boolean);

      // أي صورة كانت موجودة قبل كده وملهاش وجود في القائمة اللي رجعت من الفرونت
      // معناها المستخدم مسحها، فلازم نمسحها من Cloudinary كمان عشان منسيبش ملفات يتيمة
      const removedImages = product.images.filter(
        (img) => img.publicId && !keptPublicIds.includes(img.publicId),
      );
      await Promise.all(
        removedImages.map((img) =>
          cloudinary.uploader
            .destroy(img.publicId)
            .catch((err) =>
              console.error("فشل حذف صورة منتج قديمة:", err.message),
            ),
        ),
      );

      product.images = keptImages;
    }

    const newImageMeta = parseJSON(body.newImageMeta, []);
    const newImages = (req.files?.images || []).map((file, index) => ({
      url: file.path,
      publicId: file.filename,
      tags: newImageMeta[index]?.tags || [],
      isPrimary: newImageMeta[index]?.isPrimary || false,
    }));
    if (newImages.length > 0) {
      product.images = [...product.images, ...newImages];
    }

    if (
      product.images.length > 0 &&
      !product.images.some((img) => img.isPrimary)
    ) {
      product.images[0].isPrimary = true;
    }

    if (req.files?.video?.[0]) {
      // احذف الفيديو القديم من Cloudinary قبل ما نستبدله
      if (product.videoFilePublicId) {
        await cloudinary.uploader
          .destroy(product.videoFilePublicId, { resource_type: "video" })
          .catch((err) =>
            console.error("فشل حذف الفيديو القديم:", err.message),
          );
      }
      product.videoFile = req.files.video[0].path;
      product.videoFilePublicId = req.files.video[0].filename;
    }

    await product.save();

    return res.status(200).json({ message: "تم تحديث المنتج بنجاح", product });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "رمز SKU مستخدم بالفعل" });
    }
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تغيير حالة النشر بسرعة (نشط / مسودة / مخفي...)
  PATCH /api/products/:id/status
*/
exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "published",
      "draft",
      "under_review",
      "hidden",
      "awaiting_photos",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { publishStatus: status },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    return res
      .status(200)
      .json({ message: "تم تحديث حالة المنتج بنجاح", product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف منتج
  DELETE /api/products/:id
*/
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    // احذف كل صور المنتج وفيديوه من Cloudinary قبل حذف المنتج نفسه
    const destroyTasks = product.images
      .filter((img) => img.publicId)
      .map((img) =>
        cloudinary.uploader
          .destroy(img.publicId)
          .catch((err) => console.error("فشل حذف صورة منتج:", err.message)),
      );

    if (product.videoFilePublicId) {
      destroyTasks.push(
        cloudinary.uploader
          .destroy(product.videoFilePublicId, { resource_type: "video" })
          .catch((err) => console.error("فشل حذف فيديو منتج:", err.message)),
      );
    }

    await Promise.all(destroyTasks);
    await product.deleteOne();

    return res.status(200).json({ message: "تم حذف المنتج بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

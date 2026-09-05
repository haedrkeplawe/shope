const mongoose = require("mongoose");

/*
  موديل المنتج - شامل لكل خطوات ويزارد "إضافة منتج"
  ملاحظة: المتجر منصة إعادة بيع (Resale) - القطع مستعملة، لذلك فيه حقول
  زي "حالة القطعة" و"تقرير الفحص" مش موجودة عادةً في متاجر المنتجات الجديدة

  - المنتج الواحد ممكن يكون متاح بأكتر من لون وأكتر من مقاس (مخزون مشترك،
    مش SKU منفصل لكل تركيبة)

  ⚠️ ملاحظة مهمة (الفلاتر المتقدمة):
  الحقول: pieceType, gender, brand, season, colors, sizes, condition,
  qualityRating, mainFabric, fabricDensity, fabricElasticity
  قيمها بقت تُدار من صفحة "الفلاتر المتقدمة" (موديل AdvancedFilter) مش من enum
  ثابت هون بالموديل. لهيك مفيش enum عليها - أي قيمة نشطة موجودة بالفلتر المرتبط
  مسموح تتخزن. التحقق من صحة القيمة (إنها موجودة فعليًا كقيمة نشطة بالفلتر)
  بيصير على مستوى الفرونت (بيسحب القيم من نفس الفلتر) مش الموديل.
*/

/* -------------------- خطوة 5: تركيب القماش (نسب الألياف) -------------------- */
const fabricCompositionSchema = new mongoose.Schema(
  {
    material: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

/* -------------------- خطوة 6: عنصر واحد في تقرير الفحص -------------------- */
const inspectionItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // مثال: "buttons", "stitching"
    label: { type: String, required: true }, // مثال: "الأزرار والسحابات"
    status: {
      type: String,
      enum: ["ok", "defect"],
      default: "ok",
    },
    severity: {
      type: String,
      enum: ["small", "medium", "large", null],
      default: null,
    },
    description: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/* -------------------- خطوة 3: صورة واحدة من صور المنتج -------------------- */
const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    // الـ public_id بتاع الصورة على Cloudinary - لازم نحتفظ بيه عشان نقدر نحذفها
    // من Cloudinary لما المنتج يتحدث أو يتحذف
    publicId: { type: String, default: null },
    tags: {
      type: [String], // مثال: ["من_الأمام", "على_الشخص"]
      default: [],
    },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    /* ---------- الخطوة 1: المعلومات الأساسية ---------- */
    name: {
      type: String,
      required: [true, "اسم المنتج مطلوب"],
      trim: true,
    },
    categoryId: {
      // بيخزن الفئة الفرعية لو موجودة، أو القسم الرئيسي مباشرة لو مفيش فئة فرعية
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    pieceType: {
      // نوع القطعة العام - قيمه من فلتر "piece_type" (نوع المنتج)
      type: String,
      default: null,
      trim: true,
    },
    gender: {
      // قيمه من فلتر "gender" (الجنس)
      type: String,
      default: "unisex",
      trim: true,
    },
    brand: {
      // قيمته من فلتر "brand" (الماركة)
      type: String,
      default: "",
      trim: true,
    },
    season: {
      // قيمه من فلتر "season" (الموسم) - اندمج فيه حقل "ملاءمة الموسم" القديم
      type: String,
      default: null,
      trim: true,
    },
    colors: {
      // قيمها من فلتر "color" (اللون) - متعدد
      type: [String],
      default: [],
    },
    sizes: {
      // قيمها من فلتر "size" (المقاس) - متعدد
      type: [String],
      default: [],
    },
    condition: {
      // حالة القطعة (خطوة 1) - قيمه من فلتر "condition"، مستقلة عن مؤشر الجودة
      type: String,
      default: null,
      trim: true,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    quantity: {
      // الكمية/المخزون المتاح لهذا المنتج
      type: Number,
      default: 1,
      min: 0,
    },

    /* ---------- الخطوة 2: السعر والعروض ---------- */
    price: {
      type: Number,
      required: [true, "سعر البيع مطلوب"],
      min: 0,
    },
    costPrice: { type: Number, default: null, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
    shippingPrice: { type: Number, default: 0, min: 0 },
    discountEnabled: { type: Boolean, default: false },
    freeShipping: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false }, // "منتج جديد" (شارة New) - اتغيّر اسمه من isNew لأنه اسم محجوز داخل Mongoose نفسه وكان بيمنع تسجيل createdAt تلقائيًا
    // مرتبط بفلتر "members_only" (للأعضاء فقط) - يحدد المنتج حصري للأعضاء أو لأ
    membersOnly: { type: Boolean, default: false },
    discountPercent: { type: Number, default: null, min: 0, max: 100 },
    discountEndDate: { type: Date, default: null },

    /* ---------- الخطوة 3: الصور والفيديو ---------- */
    images: {
      type: [productImageSchema],
      default: [],
    },
    videoUrl: { type: String, default: "" },
    videoFile: { type: String, default: null },
    // الـ public_id بتاع فيديو المنتج على Cloudinary (لو مرفوع كملف مباشر)
    videoFilePublicId: { type: String, default: null },

    /* ---------- الخطوة 4: المقاسات ---------- */
    qualityRating: {
      // مؤشر الجودة (خطوة 4) - فلتر مستقل "quality_rating"، مستقل عن "condition"
      type: String,
      default: null,
      trim: true,
    },
    measurements: {
      chestWidth: { type: Number, default: null },
      shoulderWidth: { type: Number, default: null },
      totalLength: { type: Number, default: null },
      sleeveLength: { type: Number, default: null },
      waist: { type: Number, default: null },
      hip: { type: Number, default: null },
    },
    buyerNote: { type: String, default: "", trim: true },

    /* ---------- الخطوة 5: القماش والعناية ---------- */
    mainFabric: {
      // قيمه من فلتر "fabric_type" (نوع القماش)
      type: String,
      default: null,
      trim: true,
    },
    fabricDensity: {
      // قيمه من فلتر "fabric_density" (كثافة القماش)
      type: String,
      default: null,
      trim: true,
    },
    fabricElasticity: {
      // قيمه من فلتر "fabric_elasticity" (مرونة القماش)
      type: String,
      default: null,
      trim: true,
    },
    fabricComposition: {
      type: [fabricCompositionSchema],
      default: [],
    },
    careInstructions: {
      // ثابتة بالكود - مش من ضمن الفلاتر المتقدمة العشرة
      type: [String],
      default: [],
    },

    /* ---------- الخطوة 6: تقرير الفحص ---------- */
    inspectionReport: {
      type: [inspectionItemSchema],
      default: [],
    },

    /* ---------- الخطوة 7: الوصف وSEO ---------- */
    shortDescription: { type: String, default: "", trim: true, maxlength: 160 },
    detailedDescription: { type: String, default: "", trim: true },
    whySpecial: { type: String, default: "", trim: true },
    seoTitle: { type: String, default: "", trim: true, maxlength: 60 },
    seoDescription: { type: String, default: "", trim: true, maxlength: 160 },
    searchTags: {
      type: [String],
      default: [],
    },

    /* ---------- حالة النشر / حالة القطعة بالمخزون ----------
       نفس الحقل بيُستخدم كمان كـ"حالة مخزون" في صفحة "المخزون وحالة القطع":
       بما إن كل قطعة أساسًا وحدة واحدة (منتج Resale)، مفيش داعي لحقل حالة
       مخزون منفصل - حالة القطعة الواحدة هي نفسها حالة نشرها بالضبط.
       "reserved" و"sold" بتتغيّر عادةً من صفحة المخزون (مش من ويزارد الإضافة). */
    publishStatus: {
      type: String,
      enum: [
        "published", // متاحة - منشورة وظاهرة بالمتجر
        "draft", // مسودة
        "under_review", // قيد الفحص
        "hidden", // مخفي
        "awaiting_photos", // قيد التصوير
        "reserved", // محجوزة - عليها حجز من عميل بس البيع لسه ما تم
        "sold", // مباعة - القطعة خرجت من المخزون فعليًا
      ],
      default: "draft",
    },

    /* ---------- إحصائيات (بتتحدث تلقائيًا من النظام) ---------- */
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    // قائمة IDs الزباين يلي فتحوا صفحة هاي القطعة فعليًا - مستخدمة داخليًا
    // بس لحساب viewsCount بشكل صحيح (كل زبون بيتحسب مرة وحدة بالضبط، مهما
    // فتح صفحة المنتج أكتر من مرة) - ما بترجع أبدًا لواجهة الزبون مباشرة
    viewedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);

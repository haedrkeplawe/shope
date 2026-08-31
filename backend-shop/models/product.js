const mongoose = require("mongoose");

/*
  موديل المنتج - شامل لكل خطوات ويزارد "إضافة منتج"
  ملاحظة: المتجر منصة إعادة بيع (Resale) - القطع مستعملة، لذلك فيه حقول
  زي "حالة القطعة" و"تقرير الفحص" مش موجودة عادةً في متاجر المنتجات الجديدة

  - المنتج الواحد ممكن يكون متاح بأكتر من لون وأكتر من مقاس (مخزون مشترك،
    مش SKU منفصل لكل تركيبة)
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
      // نوع القطعة العام (فستان / جاكيت / قميص...) - مستقل عن الفئة، بيُستخدم للفلترة
      type: String,
      default: null,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["men", "women", "kids", "unisex"],
      default: "unisex",
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    season: {
      type: String,
      enum: ["summer", "winter", "spring_fall", "all_seasons", null],
      default: null,
    },
    colors: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
    },
    condition: {
      // حالة القطعة (خطوة 1) - مستقلة عن مؤشر الجودة في خطوة 4
      type: String,
      enum: ["excellent", "very_good", "good", "acceptable", null],
      default: null,
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
    isNew: { type: Boolean, default: false },
    discountPercent: { type: Number, default: null, min: 0, max: 100 },
    discountEndDate: { type: Date, default: null },

    /* ---------- الخطوة 3: الصور والفيديو ---------- */
    images: {
      type: [productImageSchema],
      default: [],
    },
    videoUrl: { type: String, default: "" },
    videoFile: { type: String, default: null },

    /* ---------- الخطوة 4: المقاسات ---------- */
    qualityRating: {
      // مؤشر الجودة بالنجوم (خطوة 4) - مستقل عن "condition"
      type: String,
      enum: ["excellent", "very_good", "good", "acceptable", null],
      default: null,
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
    mainFabric: { type: String, default: null },
    fabricDensity: {
      type: String,
      enum: ["light", "medium", "heavy", null],
      default: null,
    },
    fabricElasticity: {
      type: String,
      enum: ["none", "slightly_stretchy", "very_stretchy", null],
      default: null,
    },
    seasonSuitability: {
      type: String,
      enum: ["summer", "winter", "spring_fall", "all_seasons", null],
      default: null,
    },
    fabricComposition: {
      type: [fabricCompositionSchema],
      default: [],
    },
    careInstructions: {
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

    /* ---------- حالة النشر ---------- */
    publishStatus: {
      type: String,
      enum: [
        "published", // نشر الآن
        "draft", // مسودة
        "under_review", // قيد الفحص
        "hidden", // مخفي
        "awaiting_photos", // قيد التصوير
      ],
      default: "draft",
    },

    /* ---------- إحصائيات (بتتحدث تلقائيًا من النظام) ---------- */
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);

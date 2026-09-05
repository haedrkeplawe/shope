const Category = require("../models/category");
const AdvancedFilter = require("../models/advancedFilter");

/*
  إنشاء فئة "غير مصنف" تلقائيًا لو مش موجودة أصلًا
  - فئة نظامية رئيسية ثابتة، بتستقبل أي منتجات أو فئات فرعية بينقلها الحذف تلقائيًا
  - بتتنفذ مرة واحدة عند تشغيل السيرفر
*/
const seedUncategorizedCategory = async () => {
  try {
    const exists = await Category.findOne({ isSystem: true });
    if (!exists) {
      await Category.create({
        name: "غير مصنف",
        parentId: null,
        order: 999,
        status: "active",
        isSystem: true,
      });
      console.log("✅ تم إنشاء فئة (غير مصنف) الافتراضية");
    }
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء فئة (غير مصنف):", error.message);
  }
};

/*
  الفلاتر المتقدمة الافتراضية (ثابتة بالكود)
  - كل فلتر مرتبط بحقل معيّن في موديل Product عن طريق productField
  - valueType: "list" فلتر بيديره الأدمن بقيم، "system" فلتر بيانات محسوبة تلقائيًا
    (نطاق السعر، حالة التخفيض، للأعضاء فقط) مفيهوش قيم تتضاف
*/
const DEFAULT_FILTERS = [
  {
    key: "color",
    displayName: "اللون",
    productField: "colors",
    isMultiValue: true,
    valueType: "list",
    level: "basic",
    order: 1,
    searchable: true,
    values: [
      { value: "أسود", label: "أسود", colorHex: "#1f1f1f" },
      { value: "أبيض", label: "أبيض", colorHex: "#ffffff" },
      { value: "أحمر", label: "أحمر", colorHex: "#ef4444" },
      { value: "أزرق", label: "أزرق", colorHex: "#3b82f6" },
      { value: "أخضر", label: "أخضر", colorHex: "#22c55e" },
      { value: "بيج", label: "بيج", colorHex: "#e6d8bd" },
      { value: "وردي", label: "وردي", colorHex: "#ec4899" },
      { value: "رمادي", label: "رمادي", colorHex: "#9ca3af" },
      { value: "بني", label: "بني", colorHex: "#92400e" },
      { value: "ذهبي", label: "ذهبي", colorHex: "#d4af37" },
      { value: "فضي", label: "فضي", colorHex: "#c0c0c0" },
      { value: "برتقالي", label: "برتقالي", colorHex: "#f97316" },
      { value: "بنفسجي", label: "بنفسجي", colorHex: "#8b5cf6" },
    ],
  },
  {
    key: "size",
    displayName: "المقاس",
    productField: "sizes",
    isMultiValue: true,
    valueType: "list",
    level: "basic",
    order: 2,
    values: [
      "XXL",
      "XL",
      "L",
      "M",
      "S",
      "XS",
      "42",
      "41",
      "40",
      "39",
      "38",
      "37",
      "36",
      "35",
    ].map((s) => ({ value: s, label: s })),
  },
  {
    key: "brand",
    displayName: "الماركة",
    productField: "brand",
    isMultiValue: false,
    valueType: "list",
    level: "advanced",
    order: 3,
    searchable: true,
    values: [],
  },
  {
    key: "price_range",
    displayName: "نطاق السعر",
    productField: "price",
    isMultiValue: false,
    valueType: "system",
    level: "basic",
    order: 4,
    values: [],
  },
  {
    key: "fabric_type",
    displayName: "نوع القماش",
    productField: "mainFabric",
    isMultiValue: false,
    valueType: "list",
    level: "advanced",
    order: 5,
    values: [
      "قطن",
      "كتان",
      "حرير",
      "صوف",
      "بوليستر",
      "دنيم",
      "نايلون",
      "اكريليك",
      "جلد",
    ].map((f) => ({ value: f, label: f })),
  },
  {
    key: "season",
    displayName: "الموسم",
    productField: "season",
    isMultiValue: false,
    valueType: "list",
    level: "basic",
    order: 6,
    values: [
      { value: "summer", label: "صيف" },
      { value: "winter", label: "شتاء" },
      { value: "spring_fall", label: "ربيع/خريف" },
      { value: "all_seasons", label: "كل الفصول" },
    ],
  },
  {
    key: "condition",
    displayName: "حالة القطعة",
    productField: "condition",
    isMultiValue: false,
    valueType: "list",
    level: "basic",
    order: 7,
    values: [
      { value: "excellent", label: "ممتازة" },
      { value: "very_good", label: "جيدة جدًا" },
      { value: "good", label: "جيدة" },
      { value: "acceptable", label: "مقبولة" },
    ],
  },
  {
    key: "discount_status",
    displayName: "حالة التخفيض",
    productField: "discountEnabled",
    isMultiValue: false,
    valueType: "system",
    level: "advanced",
    order: 8,
    values: [],
  },
  {
    key: "piece_type",
    displayName: "نوع المنتج",
    productField: "pieceType",
    isMultiValue: false,
    valueType: "list",
    level: "advanced",
    order: 9,
    values: [
      "فستان",
      "جاكيت",
      "قميص",
      "بلايزر",
      "بلوزة",
      "بنطال",
      "تنورة",
      "كارديجان",
      "معطف",
      "حذاء",
      "حقيبة",
      "إكسسوار",
    ].map((t) => ({ value: t, label: t })),
  },
  {
    key: "members_only",
    displayName: "للأعضاء فقط",
    productField: "membersOnly",
    isMultiValue: false,
    valueType: "system",
    level: "advanced",
    order: 10,
    values: [],
  },
  {
    key: "gender",
    displayName: "الجنس",
    productField: "gender",
    isMultiValue: false,
    valueType: "list",
    level: "basic",
    order: 11,
    values: [
      { value: "unisex", label: "للجنسين" },
      { value: "women", label: "نسائي" },
      { value: "men", label: "رجالي" },
      { value: "kids", label: "أطفال" },
    ],
  },
  {
    key: "quality_rating",
    displayName: "مؤشر الجودة",
    productField: "qualityRating",
    isMultiValue: false,
    valueType: "list",
    level: "basic",
    order: 12,
    values: [
      { value: "excellent", label: "ممتازة" },
      { value: "very_good", label: "جيدة جدًا" },
      { value: "good", label: "جيدة" },
      { value: "acceptable", label: "مقبولة" },
    ],
  },
  {
    key: "fabric_density",
    displayName: "كثافة القماش",
    productField: "fabricDensity",
    isMultiValue: false,
    valueType: "list",
    level: "advanced",
    order: 13,
    values: [
      { value: "light", label: "خفيف" },
      { value: "medium", label: "متوسط" },
      { value: "heavy", label: "ثقيل" },
    ],
  },
  {
    key: "fabric_elasticity",
    displayName: "مرونة القماش",
    productField: "fabricElasticity",
    isMultiValue: false,
    valueType: "list",
    level: "advanced",
    order: 14,
    values: [
      { value: "none", label: "غير مرن" },
      { value: "slightly_stretchy", label: "مرن قليلًا" },
      { value: "very_stretchy", label: "مرن جدًا" },
    ],
  },
];

/*
  إنشاء الفلاتر المتقدمة الافتراضية لو أول مرة السيرفر بيشتغل
  - بتتنفذ فلتر فلتر (مش كلها مرة واحدة) عشان لو ضفنا فلتر جديد بالكود لاحقًا
    ينزرع لوحده من غير ما يأثر على الفلاتر الموجودة والقيم اللي الأدمن ضافها
*/
const seedAdvancedFilters = async () => {
  try {
    let createdCount = 0;
    for (const def of DEFAULT_FILTERS) {
      const exists = await AdvancedFilter.findOne({ key: def.key });
      if (!exists) {
        await AdvancedFilter.create({
          ...def,
          values: def.values.map((v, index) => ({
            ...v,
            order: index + 1,
          })),
        });
        createdCount += 1;
      }
    }
    if (createdCount > 0) {
      console.log(`✅ تم إنشاء ${createdCount} فلتر متقدم افتراضي`);
    }
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الفلاتر المتقدمة:", error.message);
  }
};

module.exports = { seedUncategorizedCategory, seedAdvancedFilters };

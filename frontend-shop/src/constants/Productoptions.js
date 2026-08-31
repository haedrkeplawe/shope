/*
  خيارات ثابتة لويزارد إضافة/تعديل المنتج
  - القيم (value) بالإنجليزي عشان تتطابق مع enum الباك إند
  - التسميات (label) بالعربي عشان تظهر في الواجهة
*/

export const GENDER_OPTIONS = [
  { value: "unisex", label: "للجنسين" },
  { value: "women", label: "نسائي" },
  { value: "men", label: "رجالي" },
  { value: "kids", label: "أطفال" },
];

export const SEASON_OPTIONS = [
  { value: "summer", label: "صيف" },
  { value: "winter", label: "شتاء" },
  { value: "spring_fall", label: "ربيع/خريف" },
  { value: "all_seasons", label: "كل الفصول" },
];

export const CONDITION_OPTIONS = [
  { value: "excellent", label: "ممتازة", stars: 5 },
  { value: "very_good", label: "جيدة جدًا", stars: 4 },
  { value: "good", label: "جيدة", stars: 3 },
  { value: "acceptable", label: "مقبولة", stars: 2 },
];

export const COLOR_OPTIONS = [
  "أسود",
  "أبيض",
  "أحمر",
  "أزرق",
  "أخضر",
  "بيج",
  "وردي",
  "رمادي",
  "بني",
  "ذهبي",
  "فضي",
  "برتقالي",
  "بنفسجي",
];

// خريطة اسم اللون بالعربي → قيمة اللون الفعلية، عشان نرسم دوائر ملوّنة حقيقية
export const COLOR_HEX_MAP = {
  أسود: "#1f1f1f",
  أبيض: "#ffffff",
  أحمر: "#ef4444",
  أزرق: "#3b82f6",
  أخضر: "#22c55e",
  بيج: "#e6d8bd",
  وردي: "#ec4899",
  رمادي: "#9ca3af",
  بني: "#92400e",
  ذهبي: "#d4af37",
  فضي: "#c0c0c0",
  برتقالي: "#f97316",
  بنفسجي: "#8b5cf6",
};

export const SIZE_OPTIONS = [
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
];

export const PIECE_TYPE_OPTIONS = [
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
];

export const FABRIC_OPTIONS = [
  "قطن",
  "كتان",
  "حرير",
  "صوف",
  "بوليستر",
  "دنيم",
  "نايلون",
  "اكريليك",
  "جلد",
];

export const FABRIC_DENSITY_OPTIONS = [
  { value: "light", label: "خفيف" },
  { value: "medium", label: "متوسط" },
  { value: "heavy", label: "ثقيل" },
];

export const FABRIC_ELASTICITY_OPTIONS = [
  { value: "none", label: "غير مرن" },
  { value: "slightly_stretchy", label: "مرن قليلًا" },
  { value: "very_stretchy", label: "مرن جدًا" },
];

export const CARE_INSTRUCTIONS_OPTIONS = [
  "غسيل يدوي فقط",
  "غسيل بارد (30°)",
  "غسيل دافئ (40°)",
  "لا تغسل بالغسالة",
  "تنظيف جاف فقط",
  "كوي على حرارة منخفضة",
  "لا يجفف آليًا",
  "لا يُكوى",
];

export const IMAGE_TAG_OPTIONS = [
  "الصورة الرئيسية",
  "من الأمام",
  "من الخلف",
  "التفاصيل",
  "على المانيكان",
  "على الشخص",
  "على ملصق الماركة",
];

export const PUBLISH_STATUS_OPTIONS = [
  { value: "published", label: "نشر الآن", desc: "يظهر في المتجر فورًا" },
  { value: "draft", label: "مسودة", desc: "احفظ بدون نشر" },
  { value: "under_review", label: "قيد الفحص", desc: "بانتظار المراجعة" },
  { value: "hidden", label: "مخفي", desc: "لا يظهر للزوار" },
  {
    value: "awaiting_photos",
    label: "قيد التصوير",
    desc: "لم تكتمل الصور بعد",
  },
];

export const SEVERITY_OPTIONS = [
  { value: "large", label: "كبير" },
  { value: "medium", label: "متوسط" },
  { value: "small", label: "صغير" },
];

/*
  عناصر تقرير الفحص الافتراضية - نفس الترتيب اللي هيظهر بيه في الخطوة السادسة
*/
export const DEFAULT_INSPECTION_ITEMS = [
  {
    key: "buttons",
    label: "الأزرار والسحابات",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "stitching",
    label: "الخياطة والتفصيل",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "color_dye",
    label: "اللون والصبغة",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "embroidery",
    label: "التطريز أو الزخارف",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "fabric_lining",
    label: "الأقمشة والبطانات",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "collar_sleeves",
    label: "الياقة والأكمام",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "pockets",
    label: "الجيوب",
    status: "ok",
    severity: null,
    description: "",
  },
  {
    key: "general_detail",
    label: "التفصيل العام",
    status: "ok",
    severity: null,
    description: "",
  },
];

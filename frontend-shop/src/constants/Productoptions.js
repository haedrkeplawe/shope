/*
  خيارات ثابتة لويزارد إضافة/تعديل المنتج

  ⚠️ ملاحظة مهمة: كل الخيارات اللي كانت هون قبل كده زي الألوان والمقاسات
  ونوع القطعة والجنس والموسم وحالة القطعة ومؤشر الجودة ونوع/كثافة/مرونة القماش
  بقت تُدار من صفحة "الفلاتر المتقدمة" مش من هذا الملف. اتشالت من هون وبقت
  بتتجاب ديناميكيًا عن طريق hook: useFilterValues(key)

  اللي فضل هون هو بس الحاجات الثابتة فعلًا واللي مش من ضمن الفلاتر العشرة
  (تعليمات العناية، تاجات الصور، حالة النشر، تقرير الفحص...)
*/

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

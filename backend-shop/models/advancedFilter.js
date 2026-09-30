const mongoose = require("mongoose");

/*
  موديل الفلاتر المتقدمة (AdvancedFilter)

  الفكرة الأساسية:
  - الفلتر نفسه (مثل: اللون، المقاس، الماركة...) عنصر ثابت (isSystem: true) بيتحدد
    من الكود عن طريق seedDefaults، ومش قابل للإضافة أو الحذف من لوحة التحكم
  - الأدمن بس بيقدر:
      1) يتحكم بإعدادات ظهور الفلتر نفسه (نشط/مخفي، الترتيب، اسم العرض، قابل للبحث،
         يظهر بالكمبيوتر/الموبايل) - إعدادات عرض بس، مالها أي تأثير على بنية النظام
      2) يضيف/يعدّل/يحذف "القيم" الداخلية اللي جوا الفلتر (مثال: قيم فلتر اللون
         هي أسود/أبيض/أحمر...) لأن دول بيرجعوا لتقدير الأدمن (مقاسات، ألوان الموسم...)

  - productField: اسم الحقل المرتبط بيه في موديل Product، عشان نقدر نحسب عدد
    المنتجات المستخدمة لكل قيمة، ونربط الفورم بالفلتر ديناميكيًا
  - valueType:
      "list"   → فلتر له قيم بيديرها الأدمن (لون، مقاس، ماركة، نوع القماش...)
      "system" → فلتر بيشتغل من بيانات محسوبة تلقائيًا (نطاق السعر، حالة التخفيض،
                 للأعضاء فقط) - مفيهوش قيم تتضاف، بس ممكن تتفعيله/تعطيله
*/

const filterValueSchema = new mongoose.Schema(
  {
    value: {
      // القيمة الداخلية المخزّنة فعليًا في المنتج
      type: String,
      required: [true, "قيمة الفلتر مطلوبة"],
      trim: true,
    },
    label: {
      // اسم العرض للمستخدم/الأدمن
      type: String,
      required: [true, "اسم القيمة مطلوب"],
      trim: true,
    },
    colorHex: {
      // مستخدم بس لفلتر اللون، لرسم دائرة اللون الحقيقية
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: false },
);

const advancedFilterSchema = new mongoose.Schema(
  {
    key: {
      // المفتاح الداخلي الثابت - ميتغيّرش أبدًا، بيُستخدم بالكود للربط
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      // اسم العرض للمتجر - قابل للتعديل من الأدمن
      type: String,
      required: true,
      trim: true,
    },
    productField: {
      // اسم الحقل المرتبط في موديل Product (null لو مفيش ربط مباشر)
      type: String,
      default: null,
    },
    isMultiValue: {
      // هل المنتج ممكن ياخد أكتر من قيمة لنفس الفلتر (زي الألوان والمقاسات)
      type: Boolean,
      default: false,
    },
    valueType: {
      type: String,
      enum: ["list", "system"],
      default: "list",
    },
    level: {
      // المستوى المعروض بلوحة التحكم (أساسي/متقدم) - تصنيف عرضي بس
      type: String,
      enum: ["basic", "advanced"],
      default: "basic",
    },
    order: {
      type: Number,
      default: 1,
    },
    active: {
      // هل الفلتر يظهر عند المستخدم بالمتجر - التفعيل/الإلغاء بس، مفيش تأثير تاني
      type: Boolean,
      default: true,
    },
    searchable: {
      type: Boolean,
      default: false,
    },
    showOnDesktop: {
      type: Boolean,
      default: true,
    },
    showOnMobile: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      // دايمًا true - الفلتر ثابت، مش قابل للحذف أو الإضافة من الواجهة
      type: Boolean,
      default: true,
    },
    values: {
      type: [filterValueSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.AdvancedFilter ||
  mongoose.model("AdvancedFilter", advancedFilterSchema);

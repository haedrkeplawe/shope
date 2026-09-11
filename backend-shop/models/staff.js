const mongoose = require("mongoose");
const { PERMISSION_KEYS } = require("../utils/permissions");

/*
  موديل الموظف/المساعد (Staff)
  ------------------------------------------------------------------
  حساب "مساعد" بصلاحيات محدودة يقدر صاحب المتجر (Store) يضيفه - بعكس
  Store نفسه (الحساب الوحيد بصلاحيات غير مشروطة بالنظام كله)، كل موظف
  هون مرتبط بمجموعة صلاحيات صريحة على مستوى "صفحة/مورد" (PERMISSION_KEYS
  بـ utils/permissions.js هو مصدر الحقيقة الوحيد لأسماء هالمفاتيح - سب-
  سكيما الصلاحيات تحت مبنية منها ديناميكيًا، مش مكرّرة يدويًا هون)

  ⚠️ إدارة هالموديل بالكامل (إضافة/حذف/تعديل صلاحيات أي موظف) محصورة
  بحساب المالك حصرًا (شوف middleware/authorize.js → requireOwner) - ما
  في ولا صلاحية بالجدول تسمح لموظف يدير موظفين تانيين أو يعدّل صلاحياته
  حاله، منعًا لترقية الصلاحيات الذاتية (Privilege Escalation) - هاي
  قاعدة صلبة بالكود، مش إعداد قابل للتغيير

  نفس تدفق تسجيل الدخول المستخدم لـ Store بالضبط (هاتف + كلمة مرور +
  OTP) - موحّد بالكامل بـ store.controller.js (findAccountByPhone) عشان
  ما نكرر كل البنية التحتية لـ OTP لحساب تاني، لهيك بيحمل نفس حقول الـ
  OTP الموجودة بموديل Store تمامًا
*/

// سب-سكيما الصلاحيات مبنية ديناميكيًا من PERMISSION_KEYS - إضافة مفتاح
// جديد بـ utils/permissions.js بتنعكس هون تلقائيًا بلا أي تعديل يدوي
const permissionsSchemaFields = {};
PERMISSION_KEYS.forEach((key) => {
  permissionsSchemaFields[key] = { type: Boolean, default: false };
});
const permissionsSchema = new mongoose.Schema(permissionsSchemaFields, {
  _id: false,
});

const staffSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "الاسم الكامل مطلوب"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم الجوال مطلوب"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      select: false, // ما يترجعش مع الاستعلامات العادية - نفس أسلوب Store
    },
    // مسمى وظيفي وصفي بس (مثلاً "مسؤول مشتريات") - ما إله أي أثر على
    // الصلاحيات الفعلية، بس للعرض بشاشة "الأدوار"
    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },
    // صلاحيات الوصول لكل مورد - true = يقدر يوصل، false = ممنوع
    // (شوف requirePermission بـ middleware/authorize.js لآلية التحقق)
    permissions: {
      type: permissionsSchema,
      default: () => ({}),
    },
    // تعليق/إيقاف حساب موظف بدون حذفه نهائيًا - نفس فلسفة Store.status
    // بالضبط (بيرجع نفس رسالة "تم إيقاف هذا الحساب" عند محاولة الدخول)
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    // حقول التحقق بخطوتين (OTP) - نفس حقول Store تمامًا، لنفس تدفق الدخول
    otpCode: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    otpLastSentAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Staff || mongoose.model("Staff", staffSchema);

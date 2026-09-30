const mongoose = require("mongoose");

/*
  موديل المتجر
  - النظام فيه متجر واحد بس (مش نظام Multi-vendor)
  - بيانات المتجر بتتضاف من طرف الأدمن مباشرة عبر الباك إند
  - مفيش تسجيل ذاتي (Self Registration) للمتجر من أي فرونت إند
*/

const storeSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: [true, "اسم المتجر مطلوب"],
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "الاسم الكامل مطلوب"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم الجوال مطلوب"],
      unique: true,
      trim: true,
    },
    // -------------------- صفحة "الملف الشخصي" --------------------
    // الصورة الشخصية لصاحب المتجر - نفس أسلوب صورة الفئة بالضبط
    // (image + publicId منفصلين عشان نقدر نحذف القديمة من Cloudinary
    // لما تتغير - شوف category.controller.js → updateCategory)
    avatar: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
    },
    // نبذة شخصية قصيرة تظهر بكارت "الملف الشخصي" - اختيارية بالكامل
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    // -------------------- إعدادات المدفوعات (تبويب "الدفع" بالإعدادات) --------------------
    // شرط دائم بالكنترولر (store.controller.js → updatePaymentSettings):
    // لازم تضل طريقة وحدة مفعّلة عالأقل بأي وقت، وإلا الزبون ما بيقدر
    // يكمل طلب نهائيًا - ما منسمح تعطيل الاثنين سوا
    payments: {
      cashEnabled: { type: Boolean, default: true },
      shamCashEnabled: { type: Boolean, default: false },
      // صورة QR الخاصة بحساب شام كاش تبع المتجر - نفس أسلوب الصورة
      // الشخصية بالضبط (image + publicId منفصلين، حذف القديمة من
      // Cloudinary قبل الاستبدال - شوف store.controller.js → updateShamCashQr)
      shamCashQrImage: { type: String, default: null },
      shamCashQrImagePublicId: { type: String, default: null },
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      select: false, // ما يترجعش مع الاستعلامات العادية
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    // حقول التحقق بخطوتين (OTP) الخاصة بتسجيل الدخول عبر الهاتف
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
    // حقول "نسيت كلمة المرور" - مستقلة تمامًا عن otpCode/otpExpiresAt
    // فوق (يلي مخصصة لتسجيل الدخول بس)، عشان طلب نسيان كلمة المرور ما
    // يأثر أبدًا على أي جلسة OTP فعّالة لتسجيل دخول جارٍ بنفس اللحظة
    passwordResetOtp: {
      type: String,
      select: false,
    },
    passwordResetOtpExpire: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Store", storeSchema);

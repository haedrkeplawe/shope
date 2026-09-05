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
  },
  { timestamps: true },
);

module.exports = mongoose.model("Store", storeSchema);

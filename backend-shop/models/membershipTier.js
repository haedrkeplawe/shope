const mongoose = require("mongoose");

/*
  موديل باقة العضوية (MembershipTier)
  ------------------------------------------------------------------
  ⚠️ 3 سجلات ثابتة بس، بتتزرع مرة وحدة (seedDefaults.js → seedMembershipTiers)
  ولا يوجد أي إضافة أو حذف لاحقًا - الأدمن بس يقدر يعدّل قيمهن أو
  يفعّل/يوقف كل باقة (isActive)، تمامًا متل موديل Store (سجل وحيد ثابت)
  بس هون 3 سجلات محددة سلفًا بدل سجل واحد. tierKey هو المعرّف الثابت
  الوحيد يلي المفروض نعتمد عليه بالكود (مش الاسم المعروض displayName،
  هذا قابل للتعديل من الأدمن بحرية)

  الترتيب المنطقي: free (الحالة الطبيعية التلقائية لكل زبون) < silver <
  gold - "gold" و"silver" بس هما يلي عندهن قسم "وصل حديثًا للأعضاء
  المميزين" بواجهة المتجر (earlyAccessDelayHours أقل من قيمة free)

  ⚠️ الباقة المجانية (free) معاملة كسلوك طبيعي ثابت دايمًا بطلب صريح من
  صاحب المشروع - ما فيها خيار "إيقاف" فعليًا (شوف الحماية بـ
  adminMembership.controller.js → updateMembershipTier)
*/
const membershipTierSchema = new mongoose.Schema(
  {
    tierKey: {
      type: String,
      enum: ["gold", "silver", "free"],
      required: true,
      unique: true,
    },
    isSystem: {
      type: Boolean,
      default: true, // محمي من الحذف دايمًا - كل الـ 3 سجلات نظامية
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    // سعر عرضي بس (مرجعي للزبون) - ⚠️ النظام ما بيحاسب ولا بيجدّد ولا
    // بيتتبع أي دفع فعلي عليه، التفعيل/الإلغاء كله يدوي بالكامل من
    // الإدارة (بدون بوابة دفع أو اشتراك متكرر) - شوف ملاحظة بالتحليل
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    // -------------------- الميزة 1: نسبة خصم على الطلب --------------------
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    minPurchaseForDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // -------------------- الميزة 2: توصيل مجاني --------------------
    freeShippingMinOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    // هل ميزتي الخصم والتوصيل المجاني يتطبقوا سوا لو الاثنين مؤهلين، ولا
    // بس الأنفع للزبون بالريال (شوف utils/membershipEngine.js)
    allowStacking: {
      type: Boolean,
      default: true,
    },
    // -------------------- الميزة 3: الوصول المبكر --------------------
    // عدد الساعات بعد نشر منتج "للأعضاء فقط" (membersOnly: true) لحد ما
    // يظهر لأصحاب هاي الباقة - صفر = فوري لحظة النشر
    earlyAccessDelayHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    // إيقاف/تفعيل الباقة كاملة - الزبون المعيَّن لباقة موقوفة بيرجع
    // تلقائيًا يُعامل كصاحب الباقة المجانية لحد ما تترجع تتفعّل
    // (شوف getEffectiveTier بـ utils/membershipEngine.js)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.MembershipTier ||
  mongoose.model("MembershipTier", membershipTierSchema);

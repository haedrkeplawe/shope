const mongoose = require("mongoose");

/*
  موديل العرض (Offer) - خصم جماعي (Campaign) يطبّق على مجموعة منتجات دفعة وحدة
  مختلف عن خصم المنتج اليدوي (discountEnabled/discountPercent بموديل Product):
  - خصم المنتج اليدوي = استثناء خاص بمنتج واحد، وله الأولوية القصوى دائمًا
  - العرض هون = خصم عام تلقائي بيطبّق على نطاق أوسع (كل المنتجات/فئة/منتجات محددة)
    وما بيأثرش على أي منتج عنده خصم يدوي مفعّل أصلاً (تفادي تراكم الخصومات)

  ⚠️ العرض ما بيعدّلش سعر المنتج (price) المخزّن أبدًا - السعر الفعّال بعد
  الخصم بيتحسب لحظيًا وقت القراءة فقط (utils/applyOffers.js)، فلما العرض
  ينتهي أو يتوقف، السعر بيرجع طبيعي أوتوماتيكيًا من غير أي تعديل جماعي بالداتا

  الحالة (نشط/مجدول/منتهي/متوقف) مش مخزّنة كحقل - بتتحسب بالكنترولر من
  isActive + startDate/endDate وقت كل طلب، عشان ما يصير تضارب بيانات
*/

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "اسم العرض مطلوب"],
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: [true, "نسبة الخصم مطلوبة"],
      min: 1,
      max: 100,
    },
    startDate: {
      type: Date,
      required: [true, "تاريخ البداية مطلوب"],
    },
    endDate: {
      type: Date,
      required: [true, "تاريخ الانتهاء مطلوب"],
    },
    // إيقاف/تفعيل يدوي من الأدمن (زر "إيقاف العرض") - مستقل عن حساب التواريخ
    isActive: {
      type: Boolean,
      default: true,
    },
    targetType: {
      type: String,
      enum: [
        "all", // جميع المنتجات
        "category", // فئة محددة (وحدة فقط)
        "specific_products", // منتجات محددة
        "new_customers", // العملاء الجدد فقط (نطاق المنتجات = الكل، الشرط = عميل جديد)
      ],
      required: [true, "نوع تطبيق العرض مطلوب"],
    },
    categoryId: {
      // مطلوبة فقط لو targetType === "category"
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    productIds: {
      // مطلوبة فقط لو targetType === "specific_products"
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
    // عدّاد مرات الاستخدام الفعلي (كم مرة طُبّق هذا العرض ضمن طلب فعلي)
    // بيتحدّث تلقائيًا من نظام الطلبات لما يتبنى - حاليًا بيضل 0
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Offer || mongoose.model("Offer", offerSchema);

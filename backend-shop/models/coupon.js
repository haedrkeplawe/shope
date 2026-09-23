const mongoose = require("mongoose");

/*
  موديل الكوبون (Coupon)
  ------------------------------------------------------------------
  مستقل كليًا عن نظام العروض (Offer) وعن خصم المنتج اليدوي - الفرق
  الجوهري: العرض/الخصم اليدوي بيأثر على سعر "منتج" واحد وقت القراءة
  (utils/applyOffers.js)، أما الكوبون فبيتطبق على "الطلب كامل" (subtotal
  بعد ما يكون سعر كل منتج محسوب أصلاً مع أي عرض عليه) - يعني الاتنين
  بيتراكموا فوق بعض بشكل طبيعي، بالضبط زي أي منصة تسوق حقيقية:
  السعر النهائي للمنتجات (بعد العروض) ← ثم كوبون يخصم فوق المجموع

  ⚠️ نفس فلسفة "الحساب اللحظي" المستخدمة بكل النظام: الخصم الناتج عن
  الكوبون ما بيتخزنش بأي مكان دائم غير وقت تثبيت الطلب فعليًا (Order
  Snapshot) - قبل هيك (بالسلة) بيتحسب لحظيًا كل مرة عبر utils/couponEngine.js
  عشان لو الأدمن أوقف الكوبون أو خلصت صلاحيته وهو مطبق أصلاً بسلة زبون،
  ينكشف هذا فورًا عند أي قراءة تالية للسلة

  -------------------- نطاق الاستخدام (scopeType) --------------------
  حاليًا نوعين بس مطبّقين فعليًا:
  - "all": أي زبون يقدر يستخدم الكوبون
  - "specific_customers": مقتصر على زبون واحد أو أكثر محددين بالاسم
    (customerIds) - يغطي حالة "كوبون خاص بزبون واحد" المطلوبة حاليًا

  🔭 رؤية مستقبلية (مش مبني حاليًا بقصد - تفاديًا لأي تعقيد غير مطلوب):
  المخطط جاهز يتوسع بسهولة لاحقًا لفئات زبائن ديناميكية (VIP، عملاء
  جدد، عملاء بيطلبوا أكتر من طلبين بالأسبوع...) بمجرد ما نضيف قيمة جديدة
  لـ enum (مثلاً "segment") + حقل segmentKey + دالة "resolveSegment"
  بـ utils/couponEngine.js تتحقق هل الزبون الحالي داخل الفئة المطلوبة -
  من غير ما نكسر أي كوبون قديم موجود أصلاً بالنظام (كل كوبون قديم كان
  "all" أو "specific_customers" هيضل شغال بالضبط زي ما هو)

  -------------------- الحالة المعروضة --------------------
  زي العروض بالضبط: الحالة (نشط/مجدول/منتهي/متوقف/مستنفد) مش مخزّنة -
  بتتحسب بالكنترولر لحظة كل طلب من isActive + startDate/endDate +
  usageCount/maxUsage، عشان نتفادى أي تضارب بيانات لو حدا نسي يحدّثها
*/

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "كود الكوبون مطلوب"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // نسبة مئوية أو مبلغ ثابت بالليرة السورية
    type: {
      type: String,
      enum: ["percentage", "fixed_amount"],
      required: [true, "نوع الكوبون مطلوب"],
    },
    discountValue: {
      type: Number,
      required: [true, "قيمة الخصم مطلوبة"],
      min: 1,
    },
    // حد أقصى لمبلغ الخصم - يُستخدم فقط لو type === "percentage" (عشان
    // كوبون "خصم 25%" ما يطلع بمبلغ ضخم غير محسوب على طلب كبير جدًا).
    // بيتجاهل تمامًا لو النوع مبلغ ثابت (القيمة نفسها أصلاً هي السقف)
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: 1,
    },
    // الحد الأدنى لمجموع الطلب (subtotal) عشان الكوبون يصير قابل للتطبيق
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // الحد الأقصى لعدد مرات الاستخدام الإجمالي عبر كل الزبائن - null = غير محدود
    maxUsage: {
      type: Number,
      default: null,
      min: 1,
    },
    // عدّاد الاستخدام الفعلي - بيتحدّث بشكل ذرّي (Atomic) وقت تثبيت كل
    // طلب فعلي بالـ Transaction نفسها المستخدمة بإنزال المخزون
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // الحد الأقصى لعدد مرات استخدام "نفس الزبون" لهذا الكوبون بالذات -
    // افتراضيًا مرة وحدة، عشان كوبون "خاص بزبون واحد" ما يصير قابل
    // للاستخدام بشكل متكرر بلا حدود من نفس الزبون
    maxUsagePerCustomer: {
      type: Number,
      default: 1,
      min: 1,
    },
    startDate: {
      type: Date,
      required: [true, "تاريخ البداية مطلوب"],
    },
    endDate: {
      type: Date,
      required: [true, "تاريخ الانتهاء مطلوب"],
    },
    // إيقاف/تفعيل يدوي من الأدمن - مستقل عن حساب التواريخ (نفس فلسفة Offer.isActive)
    isActive: {
      type: Boolean,
      default: true,
    },
    scopeType: {
      type: String,
      enum: ["all", "specific_customers"],
      default: "all",
    },
    // مطلوبة فقط لو scopeType === "specific_customers"
    customerIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

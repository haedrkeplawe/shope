// user
const mongoose = require("mongoose");

/*
  موديل حساب الزبون (Customer)
  - منفصل كليًا عن موديل Store (المتجر واحد بس، الزبائن كتير)
  - نفس آلية تسجيل الدخول المستخدمة بالأدمن بالضبط: هاتف + كلمة مرور + OTP
    (حاليًا بنتخطى OTP فعليًا عبر رمز DEV_OTP_BYPASS، بس البنية جاهزة
    ومطابقة لما نربط مزود SMS حقيقي لاحقًا)
  - email: حقل شكلي بس بالفورم حاليًا - مش مستخدم بأي منطق فعلي (مش فريد،
    مش مطلوب، مش بيتحقق منه) - أضيف بناءً على طلب صريح إنه "منظر" بس
*/

/*
  -------------------- سطر واحد بسلة المشتريات --------------------
  ⚠️ سطر واحد لكل "تركيبة" مختارة (منتج + مقاس + لون) - مش لكل منتج بشكل
  عام. يعني لو الزبون ضاف نفس المنتج بمقاسين مختلفين (أو لونين مختلفين)،
  بيصيرو سطرين منفصلين بالسلة، كل واحد بكميته وشكله الخاص - عشان يضل واضح
  تمامًا للزبون وللأدمن شو بالضبط اختار الزبون بكل سطر. الكمية بس بتزيد
  على نفس السطر لو المنتج + المقاس + اللون متطابقين تمامًا مع سطر موجود
  أصلاً (شوف addToCart بالكنترولر لمنطق المطابقة الكامل)

  المخزون (Product.quantity) مشترك على مستوى المنتج نفسه بغض النظر عن
  المقاس/اللون (زي ما هو موضح بموديل Product) - فمجموع كميات كل الأسطر
  التابعة لنفس المنتج (بمقاساته/ألوانه المختلفة) لازم ما يتخطى أبدًا
  Product.quantity الفعلي - هاد التحقق بيصير بالكنترولر (addToCart/
  updateCartItem) مش هون بالموديل

  الكمية هون بس "طلب الزبون" الخام - السعر والتحقق من توفر الكمية الفعلية
  بيصير لحظيًا وقت القراءة (utils/serializeCart.js)، مش مخزّن هون أبدًا -
  نفس فلسفة السعر الفعّال المستخدمة بكل النظام بالضبط (applyOffers.js)

  ملاحظة تقنية مهمة: خليّنا Mongoose يولّد _id تلقائي لكل سطر (شلنا
  `{ _id: false }` يلي كانت موجودة قبل) - لأنه بقى ممكن يتكرر نفس
  الـ productId بأكتر من سطر بنفس السلة، فمعرّف المنتج لحاله ما عاد كافي
  يحدد السطر المقصود بالضبط عند التعديل/الحذف - الـ _id الخاص بالسطر نفسه
  هو الهوية الوحيدة الموثوقة (مستخدم بـ updateCartItem/removeCartItem)
*/
const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  size: { type: String, default: null }, // المقاس المختار وقت الإضافة (لو المنتج بيدعم مقاسات)
  color: { type: String, default: null }, // اللون المختار وقت الإضافة (لو المنتج بيدعم ألوان) - القيمة الداخلية من فلتر "color"
  quantity: { type: Number, default: 1, min: 1 },
  addedAt: { type: Date, default: Date.now },
});

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "الاسم الكامل مطلوب"],
      trim: true,
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم الهاتف مطلوب"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      select: false,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    // حقول التحقق بخطوتين (OTP) - نفس بنية Store بالضبط
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
    // منتجات المفضلة (Wishlist) - قائمة IDs بس، بترجع للمنتج الحقيقي
    // بموديل Product عن طريق populate وقت الحاجة (صفحة المفضلة نفسها)
    favorites: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    // سلة المشتريات
    cart: {
      type: [cartItemSchema],
      default: [],
    },
    // كود الكوبون المطبّق حاليًا على السلة (لو في) - نخزّن الكود نفسه بس
    // (String) مش مرجع (ObjectId) للكوبون، لأنه بيتحقق من صلاحيته من
    // جديد لحظيًا كل مرة (utils/couponEngine.js) وقت أي قراءة للسلة، نفس
    // فلسفة "بدون Snapshot قبل لحظة الشراء الفعلية" المتبعة بكل النظام.
    // بيترمسح تلقائيًا (null) لو تبيّن إنه ما عاد صالح، أو لحظة تثبيت الطلب
    appliedCoupon: {
      type: String,
      default: null,
    },

    /*
      -------------------- عضوية الولاء (Membership) --------------------
      مرجع لباقة عضوية (شوف موديل MembershipTier) - يُعيَّن يدويًا من
      الأدمن فقط (شوف adminMembership.controller.js)، بدون أي تفعيل ذاتي
      من الزبون نفسه إطلاقًا (النظام كله يدوي بالكامل - بلا بوابة دفع
      ولا تجديد تلقائي)

      ⚠️ null = الباقة المجانية ضمنيًا - عن قصد ما بنخزّن مرجع فعلي
      للباقة المجانية على كل زبون (نفس فلسفة "بدون تخزين حالة مشتقة"
      المتبعة بكل النظام) - الباقة الفعلية للزبون بتتحدد لحظة القراءة
      دايمًا عبر utils/membershipEngine.js → getEffectiveTier
    */
    membershipTierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipTier",
      default: null,
    },
    // لحظة آخر تعيين/تغيير لباقة الزبون - أساس حساب "المشتركون الجدد"
    // و"نسبة النمو الشهري" بشاشة الأدمن (نفس فلسفة marketer.assignedAt
    // بالأسفل بالضبط)
    membershipAssignedAt: {
      type: Date,
      default: null,
    },

    /*
      -------------------- التسويق بالعمولة (Affiliate) --------------------
      المسوق هو نفسه حساب الزبون العادي بالضبط - بدون موديل مستقل ولا حساب
      دخول تاني - بس معلَّم من الأدمن كـ "مسوق" بحقل isMarketer. الأدمن
      بيعيّن مسوق عن طريق اختيار زبون مسجَّل فعليًا (بحث بالاسم/الهاتف، نفس
      البنية المستخدمة أصلاً باختيار زبائن الكوبون الخاص) - ما في إنشاء
      حساب جديد من لوحة الأدمن أبدًا، نفس مبدأ باقي النظام حاليًا تمامًا.

      code: رمز الإحالة - يُدخله الأدمن يدويًا بالكامل (مش متولّد تلقائيًا)
      وقت التعيين، ومخزّن Uppercase دايمًا (uppercase: true) بنفس فلسفة
      Coupon.code بالضبط - عشان المطابقة وقت التحقق (utils/marketerEngine.js)
      تصير غير حساسة لحالة الأحرف بدون أي منطق إضافي

      status: "active" | "paused" - المسوق المعلَّق كوده ما يعود يُقبل وقت
      إنشاء طلب جديد (زي كوبون متوقف بالضبط) - بس الطلبات القديمة يلي
      استخدمته وهو نشط بتضل صحيحة (الحالة هون بتتحقق لحظة الطلب فقط، مش
      Snapshot على الطلب نفسه)

      ⚠️ أي إضافة أو صفحة جديدة تخص المسوق بواجهة المتجر (حسابي) لازم تظهر
      فقط لو isMarketer === true - زبون عادي ما بيشوفها إطلاقًا ولا بيقدر
      يوصلها حتى برابط مباشر (الكنترولر بيتحقق من هالحقل قبل أي رد)

      لو الأدمن ألغى تعيين الزبون كمسوق لاحقًا (isMarketer: false)، حسابه
      العادي بكل بياناته يضل زي ما هو، وبس بيختفي عنده قسم "لوحة المسوق" -
      وبنفس الوقت الطلبات القديمة يلي جابها هو (marketerName/code/commission
      المخزّنة كـ Snapshot بموديل Order) بتضل تعرض صح تمامًا بلوحة الأدمن
    */
    marketer: {
      isMarketer: { type: Boolean, default: false },
      code: { type: String, default: null, trim: true, uppercase: true },
      commissionPercentage: { type: Number, default: 10, min: 0, max: 100 },
      status: {
        type: String,
        enum: ["active", "paused"],
        default: "active",
      },
      assignedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// فهرس فريد على رمز الإحالة - sparse عشان أغلب الزبائن العاديين ماعندهمش
// كود أصلاً (null) وما لازم يتعارضوا مع بعض على القيمة الفاضية
customerSchema.index({ "marketer.code": 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

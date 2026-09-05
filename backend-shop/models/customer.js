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
  سطر واحد لكل منتج (مش لكل مقاس - المخزون عندنا رقم واحد مشترك للمنتج
  كله مش لكل مقاس لحاله). الكمية هون بس "طلب الزبون" الخام - السعر
  والتحقق من توفر الكمية الفعلية بيصير لحظيًا وقت القراءة
  (utils/serializeCart.js)، مش مخزّن هون أبدًا - نفس فلسفة السعر الفعّال
  المستخدمة بكل النظام بالضبط (applyOffers.js)
*/
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    size: { type: String, default: null }, // المقاس المختار وقت الإضافة (لو المنتج بيدعم مقاسات)
    quantity: { type: Number, default: 1, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

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
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

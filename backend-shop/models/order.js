const mongoose = require("mongoose");

/*
  موديل الطلب (Order)
  ------------------------------------------------------------------
  موديل منفصل كليًا عن Customer (زي ما كان)، شوف باقي الشرح التاريخي
  بالأسفل - القسم الوحيد يلي تغيّر جوهريًا هون هو "الشحن":

  ⚠️ تحديث نظام الشحن: سعر الشحن ما عاد بيتحدد لكل قطعة لحالها (اتشال
  حقل shippingPrice من orderItemSchema نهائيًا - أصلاً ما كان ظاهر
  للزبون بأي واجهة، كان بس رقم داخلي ميت). بقى في سعر شحن واحد على
  مستوى "الطلب كامل" محسوب حسب منطقة شحن الزبون (utils/shippingEngine.js)
  - shippingTotal ضلت موجودة زي ما هي (نفس الاسم، بس مصدرها تغيّر)
  - shippingZoneId: مرجع اختياري لمنطقة الشحن وقت الطلب (لو اتحذفت
    المنطقة بعدين يضل null بالمرجع بس باقي حقول الـ Snapshot تحت بتضل
    تعرض صح دايمًا - نفس فلسفة couponId/couponCode بالضبط)
  - shippingZoneName / shippingDurationLabel: Snapshot ثابت لاسم
    المنطقة ومدة التوصيل وقت الطلب بالضبط - حتى لو الأدمن غيّر اسم
    المنطقة أو سعرها أو مدتها بعدين، الطلب القديم بيضل عارض بالضبط
    شو كان متوقع للزبون وقتها

  ⚠️ فرق جوهري عن السلة: بيانات المنتج هون (السعر، الاسم، الصورة...)
  Snapshot ثابت وقت إنشاء الطلب - وليس محسوبة لحظيًا زي السلة. لو تغيّر
  سعر المنتج أو اتحذف بعدين، الطلب القديم لازم يضل يعرض بالضبط شو دفع
  الزبون وقتها - مش السعر الحالي. هاد أهم فرق بين فلسفة السلة (حية دائمًا)
  وفلسفة الطلب (لقطة ثابتة لحظة الشراء) - ونفس المبدأ بالضبط منطبق على
  الكوبون ومنطقة الشحن سوا: حتى لو اتحذفوا أو اتغيّرت شروطهم بعدين،
  الطلب القديم بيضل عارض بالضبط شو استفاد منه الزبون وقتها

  رقم الطلب (orderNumber) بيتولد تلقائيًا من الـ _id نفسه (pre-save hook)
  - ما بيعتمد على عدّاد منفصل (يلي ممكن يصير فيه Race Condition لو صار
  طلبين بنفس اللحظة)، فريد 100% بشكل مضمون لأنه مبني على ObjectId الفريد
  أصلاً، ونفس أسلوب بادئة SKU المستخدم بباقي النظام (TRZ-...)

  -------------------- تحديث: إدارة الطلبات من لوحة تحكم الأدمن --------------------
  statusHistory: سجل كامل لكل انتقال حالة مر فيه الطلب (بالتاريخ + ملاحظة
  اختيارية) - أساس "تتبع الطلب" الحقيقي بصفحة تفاصيل الطلب بالأدمن، بدل
  ما يكون شريط تتبع وهمي محسوب من الحالة الحالية بس. أول سطر بيتسجل
  تلقائيًا وقت إنشاء الطلب (status: "pending")

  adminNote: ملاحظة داخلية للأدمن على الطلب (مثلاً "الزبون طلب تأجيل
  التوصيل ليوم الخميس") - مش ظاهرة للزبون أبدًا، إدارية بحتة

  trackingNumber: رقم تتبع الشحنة (اختياري) - بيتعبى غالبًا لحظة تحويل
  الطلب لحالة "تم الشحن"

  stockRestored: علم داخلي بيضمن إنه المخزون يترجع مرة وحدة بس لكل طلب
  (لحظة أول انتقال لحالة "ملغي" أو "مرتجع") - حتى لو الأدمن بدّل الحالة
  أكتر من مرة بعدين، ما تتكرر زيادة المخزون على نفس الطلب أبدًا
  (utils/orderStatusEngine.js هو المسؤول عن تنفيذ الإرجاع الفعلي)
*/

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Snapshot كامل لبيانات المنتج وقت الشراء - مستقل تمامًا عن حالة
    // المنتج الحالية بالمخزون (حتى لو اتحذف المنتج نهائيًا بعدين)
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    image: { type: String, default: null },
    size: { type: String, default: null },
    // اللون المختار وقت الشراء - Snapshot زي كل بيانات المنتج التانية بهاد
    // الموديل (لو تغيّر لون المنتج أو حتى اتحذف من الفلاتر لاحقًا، الطلب
    // القديم بيضل عارض بالضبط شو اختار الزبون واشترى وقتها)
    color: { type: String, default: null },
    // كود اللون الست (Hex) وقت الشراء - محفوظ سوا مع اللون نفسه عشان نقدر
    // نرسم دائرة اللون الحقيقية بصفحة تفاصيل الطلب حتى لو انحذف/اتغيّر
    // تعريف هاللون لاحقًا من لوحة تحكم الأدمن
    colorHex: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }, // السعر الفعلي وقت الدفع (بعد أي خصم/عرض كان فعّال وقتها)
    originalPrice: { type: Number, default: null },
    discountPercent: { type: Number, default: null },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

// سطر واحد من سجل انتقالات حالة الطلب - شوف الشرح فوق
const orderStatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (arr) => arr.length > 0,
    },

    // معلومات التوصيل - Snapshot وقت الطلب، مش مرتبطة بحساب الزبون بشكل
    // مباشر (لو الزبون غيّر بياناته بحسابه بعدين، الطلبات القديمة تضل
    // عارضة نفس المعلومات يلي أدخلها وقت الطلب بالضبط)
    shipping: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      region: { type: String, default: "", trim: true },
      postalCode: { type: String, default: "", trim: true },
    },

    // -------------------- منطقة الشحن (Snapshot وقت الطلب) --------------------
    // shippingZoneId مرجع اختياري (لو اتحذفت المنطقة بعدين يضل null
    // بالمرجع بس shippingZoneName/shippingDurationLabel نص ثابت بيضل
    // يعرض صح دايمًا) - نفس فلسفة couponId/couponCode بالضبط فوق
    shippingZoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingZone",
      default: null,
    },
    shippingZoneName: { type: String, default: "" },
    shippingDurationLabel: { type: String, default: "" },

    // الدفع نقدًا عند الاستلام حصرًا حاليًا - enum بقيمة وحيدة عن قصد،
    // جاهز نضيف عليه طرق تانية لاحقًا بدون ما نكسر أي طلب قديم
    paymentMethod: {
      type: String,
      enum: ["cash"],
      default: "cash",
    },

    // مجاميع Snapshot (نفس أرقام لحظة الدفع بالضبط)
    subtotal: { type: Number, required: true },
    totalSavings: { type: Number, default: 0 }, // وفورات مستوى المنتج (عروض/خصم يدوي) - منفصلة عن خصم الكوبون عن قصد
    shippingTotal: { type: Number, default: 0 },

    // -------------------- الكوبون (Snapshot وقت الطلب) --------------------
    // couponId مرجع اختياري (لو الكوبون اتحذف بعدين يضل null بالمرجع بس
    // couponCode نص ثابت بيضل يعرض صح دايمًا) - couponDiscount المبلغ
    // الفعلي المخصوم وقتها بالضبط، بغض النظر عن أي تعديل لاحق على الكوبون
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },

    grandTotal: { type: Number, required: true }, // = subtotal - couponDiscount + shippingTotal

    status: {
      type: String,
      enum: [
        "pending", // بانتظار تأكيد المتجر (جديد)
        "confirmed", // تم التأكيد
        "processing", // قيد التجهيز
        "shipped", // تم الشحن
        "delivered", // تم التسليم
        "cancelled", // ملغي
        "returned", // مرتجع
      ],
      default: "pending",
    },

    // سجل كامل لكل انتقالات الحالة - شوف شرح الموديل فوق
    statusHistory: {
      type: [orderStatusHistorySchema],
      default: [],
    },

    // ملاحظة داخلية للأدمن - غير ظاهرة للزبون
    adminNote: { type: String, default: "", trim: true, maxlength: 1000 },

    // رقم تتبع الشحنة (اختياري)
    trackingNumber: { type: String, default: "", trim: true },

    // علم داخلي: هل تم إرجاع كمية هذا الطلب للمخزون فعليًا (لحظة الإلغاء/الإرجاع)
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const idPart = this._id.toString().slice(-5).toUpperCase();
    this.orderNumber = `TRZ-${datePart}-${idPart}`;
  }
});

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);

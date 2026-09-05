const mongoose = require("mongoose");

/*
  موديل الطلب (Order)
  ------------------------------------------------------------------
  موديل منفصل كليًا (Collection لحاله) - مش جوا Customer زي المفضلة
  والسلة، لأن الطلب سجل تاريخي مستقل بطبيعته (له حالة، تاريخ، رقم مرجعي،
  ولازم يظهر بلوحة تحكم الأدمن لاحقًا لإدارة الطلبات بشكل مستقل)

  ⚠️ فرق جوهري عن السلة: بيانات المنتج هون (السعر، الاسم، الصورة...)
  Snapshot ثابت وقت إنشاء الطلب - وليس محسوبة لحظيًا زي السلة. لو تغيّر
  سعر المنتج أو اتحذف بعدين، الطلب القديم لازم يضل يعرض بالضبط شو دفع
  الزبون وقتها - مش السعر الحالي. هاد أهم فرق بين فلسفة السلة (حية دائمًا)
  وفلسفة الطلب (لقطة ثابتة لحظة الشراء)

  رقم الطلب (orderNumber) بيتولد تلقائيًا من الـ _id نفسه (pre-save hook)
  - ما بيعتمد على عدّاد منفصل (يلي ممكن يصير فيه Race Condition لو صار
  طلبين بنفس اللحظة)، فريد 100% بشكل مضمون لأنه مبني على ObjectId الفريد
  أصلاً، ونفس أسلوب بادئة SKU المستخدم بباقي النظام (TRZ-...)
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
    shippingPrice: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
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

    // الدفع نقدًا عند الاستلام حصرًا حاليًا - enum بقيمة وحيدة عن قصد،
    // جاهز نضيف عليه طرق تانية لاحقًا بدون ما نكسر أي طلب قديم
    paymentMethod: {
      type: String,
      enum: ["cash"],
      default: "cash",
    },

    // مجاميع Snapshot (نفس أرقام لحظة الدفع بالضبط)
    subtotal: { type: Number, required: true },
    totalSavings: { type: Number, default: 0 },
    shippingTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        "pending", // بانتظار تأكيد المتجر
        "confirmed", // تم التأكيد
        "processing", // قيد التجهيز
        "shipped", // تم الشحن
        "delivered", // تم التسليم
        "cancelled", // ملغي
      ],
      default: "pending",
    },
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

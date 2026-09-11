const mongoose = require("mongoose");

/*
  موديل منطقة الشحن (ShippingZone)
  ------------------------------------------------------------------
  ⚠️ تغيير جوهري بالنظام: سعر الشحن ما عاد يتحدد على مستوى "القطعة"
  (اتشال shippingPrice/freeShipping من موديل Product نهائيًا) - بقى
  يتحدد على مستوى "السلة كاملة" حسب المحافظة/المنطقة يلي الزبون بده
  يوصله فيها الطلب، ومحسوب فقط لحظة تحويل السلة لطلب فعلي (مش قبل هيك)

  - name: اسم المنطقة يلي بيظهر للأدمن وللزبون (مثال: "دمشق وريفها")
  - cities: المدن المغطاة بهاي المنطقة (نفس السعر لكل مدنها) - الزبون
    بالمتجر بيختار "مدينة" مباشرة (مش "منطقة")، والنظام بيلاقي تلقائيًا
    أي منطقة شحن تابعة إلها هاي المدينة عشان يحسب السعر - نفس فكرة
    Category (تصنيف تجميعي) بس أبسط، مستوى واحد بدون تشعيب

  ⚠️ قيد مهم: نفس المدينة ما بتنقدر تتكرر بأكتر من منطقة شحن نشطة بنفس
  الوقت (بيتحقق منه بالكنترولر وقت الإنشاء/التعديل) - عشان يضل في مصدر
  حقيقة واحد بس لسعر شحن أي مدينة، من غير أي تعارض أو غموض

  - price: سعر الشحن الأساسي لهاي المنطقة (بالليرة السورية)
  - freeShippingThreshold: لو السلة (subtotal) وصلت أو تخطت هاد المبلغ
    الشحن بيصير مجاني تلقائيًا - null يعني ما في حد أدنى للشحن المجاني
    بهاي المنطقة أبدًا
  - deliveryDurationMin/Max: مدة التوصيل المتوقعة بالأيام (نطاق)
  - isActive: تفعيل/إيقاف يدوي من الأدمن - المنطقة الموقوفة ما بتظهر
    للزبون بصفحة الدفع أبدًا وما بتنقبل بإنشاء طلب حتى لو انبعت يدويًا

  ⚠️ فلسفة الحساب اللحظي (نفس مبدأ Offer/Coupon بالضبط): السعر هون بس
  "الإعداد الحالي" - مش بيتخزن بأي طلب مباشرة. utils/shippingEngine.js
  هو المسؤول الوحيد عن حساب السعر الفعلي لحظة إنشاء الطلب، وبعدين
  الطلب نفسه بياخد Snapshot ثابت (اسم المنطقة + السعر + المدة) عن طريق
  حقول shippingZoneName/shippingDurationLabel بموديل Order - فلو
  الأدمن غيّر سعر المنطقة أو حذفها بعدين، الطلبات القديمة بتضل تعرض
  بالضبط شو دفع الزبون وقتها، تمامًا متل فلسفة الكوبون
*/
const shippingZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم منطقة الشحن مطلوب"],
      trim: true,
    },
    cities: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "لازم تضيف مدينة واحدة على الأقل لهذه المنطقة",
      },
    },
    price: {
      type: Number,
      required: [true, "سعر الشحن مطلوب"],
      min: 0,
    },
    // null = ما في شحن مجاني بهاي المنطقة إطلاقًا
    freeShippingThreshold: {
      type: Number,
      default: null,
      min: 0,
    },
    deliveryDurationMin: {
      type: Number,
      required: [true, "الحد الأدنى لمدة التوصيل مطلوب"],
      min: 0,
    },
    deliveryDurationMax: {
      type: Number,
      required: [true, "الحد الأقصى لمدة التوصيل مطلوب"],
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // ترتيب العرض بصفحة الأدمن وقائمة اختيار المدينة عند الزبون
    order: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.ShippingZone ||
  mongoose.model("ShippingZone", shippingZoneSchema);

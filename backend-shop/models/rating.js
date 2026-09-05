const mongoose = require("mongoose");

/*
  موديل التقييم (Rating)
  ------------------------------------------------------------------
  تقييم نجوم + تعليق نصي اختياري - سطر واحد فريد لكل تركيبة
  (productId + customerId) عشان نضمن إنه كل زبون يقدر يقيّم نفس المنتج
  مرة وحدة بس. لو رجع وقيّم القطعة تاني، بنعتبرها "إعادة تقييم" (تحديث
  لنفس السطر الموجود أصلاً) مش تقييم إضافي جديد - المنطق هاد بيصير
  بالكنترولر (findOneAndUpdate بـ upsert)، بس الـ index الفريد المركّب
  تحت هو الضمانة الحقيقية على مستوى الداتابيز نفسها (مش بس منطق بالكود -
  حتى لو صار Race Condition بطلبين متزامنين، الداتابيز نفسها بترفض أي
  تكرار)

  القيمة (value) بتدعم أنصاف النجوم - أي مضاعف لـ 0.5 من 0.5 لحد 5
  (0.5, 1, 1.5, 2 ... 5) - نجمة كاملة أو نص نجمة بس، مش أي رقم عشوائي

  comment: تعليق نصي اختياري بالكامل (النجوم لحالها كافية للتقييم) - لو
  انكتب، بيظهر بقائمة "آراء الزبائن" بصفحة المنتج جنب اسم الزبون ونجومه
*/
const ratingSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    value: {
      type: Number,
      required: [true, "قيمة التقييم مطلوبة"],
      min: 0.5,
      max: 5,
      validate: {
        // Number.isInteger(v*2) بيتأكد إنه القيمة مضاعف صحيح لـ 0.5 بالضبط
        // (يمنع قيم زي 3.3 أو 4.7 يلي مالها معنى بنجوم/أنصاف نجوم)
        validator: (v) => Number.isInteger(v * 2),
        message: "قيمة التقييم لازم تكون نجمة كاملة أو نصف نجمة",
      },
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "التعليق طويل كتير (500 حرف كحد أقصى)"],
    },
  },
  { timestamps: true },
);

// ضمانة حقيقية على مستوى الداتابيز: سطر وحيد بالضبط لكل تركيبة
// (منتج + زبون) - أساس تحقيق "تقييم مرة وحدة، وبعدين إعادة تقييم بس"
ratingSchema.index({ productId: 1, customerId: 1 }, { unique: true });

module.exports =
  mongoose.models.Rating || mongoose.model("Rating", ratingSchema);

const mongoose = require("mongoose");

/*
  موديل الفئة (Category)
  - بيمثل الأقسام الرئيسية والفئات الفرعية في نفس الوقت
  - parentId = null  →  قسم رئيسي
  - parentId = فيها قيمة  →  فئة فرعية تابعة لقسم رئيسي
  - العمق مسموح بمستويين بس (قسم رئيسي ← فئة فرعية)، مفيش تداخل أعمق من كده
    (المنطق ده بيتفرض من الكنترولر، مش من الموديل نفسه)
*/

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم الفئة مطلوب"],
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    // الـ public_id بتاع صورة الفئة على Cloudinary - لازم نحتفظ بيه عشان نقدر نحذف
    // الصورة القديمة من Cloudinary لما تتغير أو الفئة تتحذف
    imagePublicId: {
      type: String,
      default: null,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    order: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["active", "hidden"],
      default: "active",
    },
    // فئة نظامية زي "غير مصنف" - بتتنشأ تلقائيًا وميتقدرش تتحذف أبدًا
    isSystem: {
      type: Boolean,
      default: false,
    },
    // كود مختصر بالإنجليزي يُستخدم في توليد SKU تلقائيًا (مثال: "NS" لفئة نسائي)
    // اختياري - لو فاضي هنولد كود بديل وقت إنشاء المنتج
    code: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

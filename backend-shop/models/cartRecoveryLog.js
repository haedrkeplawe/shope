const mongoose = require("mongoose");

/*
  موديل سجل "محاولات استرداد السلة المتروكة" (CartRecoveryLog)
  ------------------------------------------------------------------
  كل مرة الأدمن ياخد إجراء (تذكير أو إرسال كوبون) على سلة متروكة لزبون
  معيّن، بنسجّل سطر هون فيه: وقت الإجراء + قيمة السلة وقتها بالضبط
  (Snapshot ثابت، بنفس فلسفة الطلبات - Order) + نوع الإجراء.

  ⚠️ "هل تم الاسترداد فعليًا؟" مش حقل مخزّن هون عن قصد (نفس فلسفة الحالة
  المحسوبة لحظيًا المتبعة بكل النظام - applyOffers.js/offer.status..):
  بيتحسب وقت القراءة بس بمقارنة تاريخ هذا السجل مع وجود أي طلب (Order)
  لنفس الزبون بتاريخ إنشاء لاحق له - شوف
  controllers/abandonedCart.controller.js → getAbandonedCartsOverview
*/
const cartRecoveryLogSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ["reminder", "coupon"],
      required: true,
    },
    // قيمة السلة الفعلية (subtotal) وقت إرسال الإجراء بالضبط - أساس حساب
    // "قيمة مستردة" لاحقًا لو تحوّلت هالسلة لطلب فعلي
    cartValueAtSend: { type: Number, required: true, min: 0 },
    cartItemsCountAtSend: { type: Number, required: true, min: 0 },
    // كود الكوبون المُرسل - يتعبى بس لو actionType === "coupon"
    couponCode: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.CartRecoveryLog ||
  mongoose.model("CartRecoveryLog", cartRecoveryLogSchema);

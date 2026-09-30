// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const createUploader = require("../middleware/uploadImage");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  uploadPaymentReceipt,
} = require("../controllers/order.controller");

const uploadReceipt = createUploader("payments/receipts");

// كل راوتس الطلبات بدها تسجيل دخول - نفس فلسفة الموقع بالكامل
router.use(verifyCustomer);

// ⚠️ الطلب هلق multipart/form-data دايمًا (مش JSON خام) عشان يقدر يحمل
// صورة إيصال دفع شام كاش الاختيارية - shipping بيوصل كنص JSON (شوف
// parseJSON بـ order.controller.js). لو الحقل مش مرفق (طلب كاش)، multer
// بيمرّ عادي من غير ما يفرض وجوده
router.post("/", uploadReceipt.single("paymentReceiptImage"), createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
// رفع صورة إيصال جديدة لنفس الطلب بعد رفض الأدمن - شوف شرح كامل
// بالكنترولر
router.patch(
  "/:id/payment-receipt",
  uploadReceipt.single("paymentReceiptImage"),
  uploadPaymentReceipt,
);

module.exports = router;

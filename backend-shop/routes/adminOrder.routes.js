const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getOrderStats,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderNote,
  confirmPayment,
  rejectPayment,
} = require("../controllers/adminOrder.controller");

/*
  adminOrder.routes.js
  - مسارات إدارة الطلبات من لوحة تحكم الأدمن - مركبة على /api/admin/orders
    (منفصلة كليًا عن /api/orders الخاصة بواجهة الزبون - order.routes.js)
  - كل الراوتس محمية بـ verifyStore (تسجيل دخول أدمن)، بنفس فلسفة باقي
    راوتس لوحة التحكم
*/
router.use(verifyStore);
router.use(requirePermission("orders"));

router.get("/stats", getOrderStats);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/note", updateOrderNote);
// التحقق من دفع شام كاش - شوف شرح كامل بالكنترولر
router.patch("/:id/payment/confirm", confirmPayment);
router.patch("/:id/payment/reject", rejectPayment);

module.exports = router;

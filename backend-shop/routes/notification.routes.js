const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notification.controller");

/*
  notification.routes.js (واجهة الزبون)
  - مركبة على /api/notifications - كل الراوتس محمية بحساب زبون مسجّل دخول

  ⚠️ ملاحظة ترتيب: "/read-all" لازم تتسجّل قبل "/:id/read" بالضبط، وإلا
  Express رح يطابق "read-all" كأنها قيمة :id بالراوت التاني (نفس مشكلة
  /cart/coupon مقابل /cart/:productId الموثّقة بـ customer.routes.js)
*/
router.use(verifyCustomer);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;

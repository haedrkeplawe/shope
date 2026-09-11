const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getAbandonedCartsOverview,
  sendCartReminder,
} = require("../controllers/abandonedCart.controller");

/*
  abandonedCart.routes.js
  - مسارات صفحة "السلات المتروكة" بلوحة تحكم الأدمن - مركبة على
    /api/admin/abandoned-carts
*/
router.use(verifyStore);
router.use(requirePermission("abandonedCarts"));

router.get("/", getAbandonedCartsOverview);
router.post("/:customerId/remind", sendCartReminder);

module.exports = router;

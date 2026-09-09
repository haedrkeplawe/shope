const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const {
  getOverview,
  getCouponById,
  createCoupon,
  updateCoupon,
  updateCouponActiveState,
  deleteCoupon,
  getCustomerOptions,
} = require("../controllers/coupon.controller");

// كل راوتس الكوبونات محمية، محتاجة تسجيل دخول الأدمن
router.use(verifyStore);

router.get("/", getOverview);
router.get("/customer-options", getCustomerOptions);
router.get("/:id", getCouponById);
router.post("/", createCoupon);
router.patch("/:id", updateCoupon);
router.patch("/:id/status", updateCouponActiveState);
router.delete("/:id", deleteCoupon);

module.exports = router;

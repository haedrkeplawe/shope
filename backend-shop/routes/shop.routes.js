// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const {
  getNewArrivals,
  getMainCategories,
  getPieceTypes,
  getTestimonials,
  getShippingZones,
  getShopProducts,
  getShopFilters,
  getProductById,
  getRelatedProducts,
  submitRating,
  getMyRating,
  getProductRatings,
  getEarlyAccessProducts,
  getMembershipTiersForCustomer,
} = require("../controllers/shop.controller");

// كل راوتس المتجر بدها تسجيل دخول (نفس فلسفة الموقع بالكامل - محمي كله)
router.use(verifyCustomer);

router.get("/new-arrivals", getNewArrivals);
router.get("/categories", getMainCategories);
router.get("/piece-types", getPieceTypes);
router.get("/testimonials", getTestimonials);

/* -------------------- عضوية الولاء -------------------- */
router.get("/early-access", getEarlyAccessProducts);
router.get("/membership-tiers", getMembershipTiersForCustomer);

/* -------------------- مناطق الشحن (لصفحة الدفع) -------------------- */
router.get("/shipping-zones", getShippingZones);

/* -------------------- صفحة المتجر الكاملة -------------------- */
router.get("/products", getShopProducts);
router.get("/filters", getShopFilters);

router.get("/products/:id", getProductById);
router.get("/products/:id/related", getRelatedProducts);

/* -------------------- التقييمات (Ratings) -------------------- */
router.get("/products/:id/rating/me", getMyRating);
router.get("/products/:id/rating/list", getProductRatings);
router.post("/products/:id/rating", submitRating);

module.exports = router;

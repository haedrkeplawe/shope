// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const {
  getNewArrivals,
  getMainCategories,
  getShopProducts,
  getShopFilters,
  getProductById,
  getRelatedProducts,
  submitRating,
  getMyRating,
  getProductRatings,
} = require("../controllers/shop.controller");

// كل راوتس المتجر بدها تسجيل دخول (نفس فلسفة الموقع بالكامل - محمي كله)
router.use(verifyCustomer);

router.get("/new-arrivals", getNewArrivals);
router.get("/categories", getMainCategories);

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

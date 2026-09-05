// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const {
  getNewArrivals,
  getMainCategories,
  getProductById,
  getRelatedProducts,
} = require("../controllers/shop.controller");

// كل راوتس المتجر بدها تسجيل دخول (نفس فلسفة الموقع بالكامل - محمي كله)
router.use(verifyCustomer);

router.get("/new-arrivals", getNewArrivals);
router.get("/categories", getMainCategories);
router.get("/products/:id", getProductById);
router.get("/products/:id/related", getRelatedProducts);

module.exports = router;

const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const {
  uploadProductMedia,
  uploadProductMediaToCloudinary,
} = require("../middleware/uploadproductmedia");
const {
  getProducts,
  getProductById,
  getGeneratedSku,
  getFilterOptions,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} = require("../controllers/product.controller");

// كل راوتس المنتجات محمية، محتاجة تسجيل دخول
router.use(verifyStore);

// خطوتين لازم يتسلسلوا مع بعض: (1) استقبال الملفات بالذاكرة، (2) رفعها فعليًا على Cloudinary
const mediaFields = [uploadProductMedia, uploadProductMediaToCloudinary];

// مهم: المسارات الثابتة ("/generate-sku", "/filter-options") لازم تتسجل قبل "/:id"
router.get("/", getProducts);
router.get("/generate-sku", getGeneratedSku);
router.get("/filter-options", getFilterOptions);
router.get("/:id", getProductById);
router.post("/", mediaFields, createProduct);
router.patch("/:id", mediaFields, updateProduct);
router.patch("/:id/status", updateProductStatus);
router.delete("/:id", deleteProduct);

module.exports = router;

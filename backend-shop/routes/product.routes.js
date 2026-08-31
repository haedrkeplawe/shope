const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const uploadProductMedia = require("../middleware/uploadproductmedia");
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

const mediaFields = uploadProductMedia.fields([
  { name: "images", maxCount: 10 },
  { name: "video", maxCount: 1 },
]);

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

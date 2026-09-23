const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const createUploader = require("../middleware/uploadImage");
const {
  getOverview,
  getMainOptions,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} = require("../controllers/category.controller");

const uploadCategoryImage = createUploader("categories");

// كل راوتس الفئات محمية، محتاجة تسجيل دخول
router.use(verifyStore);
router.use(requirePermission("categories"));

router.get("/overview", getOverview);
router.get("/main-options", getMainOptions);
router.get("/:id", getCategoryById);
router.post("/", uploadCategoryImage.single("image"), createCategory);
router.patch("/:id", uploadCategoryImage.single("image"), updateCategory);
router.patch("/:id/status", updateCategoryStatus);
router.delete("/:id", deleteCategory);

module.exports = router;

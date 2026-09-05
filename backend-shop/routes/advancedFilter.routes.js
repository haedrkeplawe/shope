const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const {
  getOverview,
  getFilterById,
  getActiveValuesByKey,
  updateFilterSettings,
  updateFilterStatus,
  addFilterValue,
  updateFilterValue,
  deleteFilterValue,
} = require("../controllers/advancedFilter.controller");

// كل راوتس الفلاتر المتقدمة محمية، محتاجة تسجيل دخول
router.use(verifyStore);

// مهم: "/overview" مسار ثابت لازم يتسجل قبل "/:key/values" و"/:id"
router.get("/overview", getOverview);
router.get("/:key/values", getActiveValuesByKey);
router.get("/:id", getFilterById);

router.patch("/:id", updateFilterSettings);
router.patch("/:id/status", updateFilterStatus);

router.post("/:id/values", addFilterValue);
router.patch("/:id/values/:valueId", updateFilterValue);
router.delete("/:id/values/:valueId", deleteFilterValue);

module.exports = router;

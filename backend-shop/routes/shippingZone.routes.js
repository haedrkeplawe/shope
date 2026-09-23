const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getOverview,
  getZoneById,
  createZone,
  updateZone,
  updateZoneActiveState,
  deleteZone,
} = require("../controllers/shippingZone.controller");

// كل راوتس مناطق الشحن محمية، محتاجة تسجيل دخول الأدمن
router.use(verifyStore);
router.use(requirePermission("shipping"));

router.get("/", getOverview);
router.get("/:id", getZoneById);
router.post("/", createZone);
router.patch("/:id", updateZone);
router.patch("/:id/status", updateZoneActiveState);
router.delete("/:id", deleteZone);

module.exports = router;

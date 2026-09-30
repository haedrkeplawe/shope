const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getOverview,
  getOfferById,
  createOffer,
  updateOffer,
  updateOfferActiveState,
  addProductToOffer,
  deleteOffer,
  getProductOptions,
} = require("../controllers/offer.controller");

// كل راوتس العروض محمية، محتاجة تسجيل دخول
router.use(verifyStore);
router.use(requirePermission("deals"));

router.get("/", getOverview);
router.get("/product-options", getProductOptions);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.patch("/:id", updateOffer);
router.patch("/:id/status", updateOfferActiveState);
router.patch("/:id/add-product", addProductToOffer);
router.delete("/:id", deleteOffer);

module.exports = router;

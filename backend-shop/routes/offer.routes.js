const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const {
  getOverview,
  getOfferById,
  createOffer,
  updateOffer,
  updateOfferActiveState,
  deleteOffer,
  getProductOptions,
} = require("../controllers/offer.controller");

// كل راوتس العروض محمية، محتاجة تسجيل دخول
router.use(verifyStore);

router.get("/", getOverview);
router.get("/product-options", getProductOptions);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.patch("/:id", updateOffer);
router.patch("/:id/status", updateOfferActiveState);
router.delete("/:id", deleteOffer);

module.exports = router;

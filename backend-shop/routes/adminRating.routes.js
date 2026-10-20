const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getRatingStats,
  getRatings,
  updateRatingApproval,
  deleteRating,
} = require("../controllers/adminRating.controller");

/*
  adminRating.routes.js
  - مسارات إدارة التقييمات والتعليقات من لوحة تحكم الأدمن - مركبة على
    /api/admin/ratings (منفصلة عن راوتس التقييم بواجهة الزبون الموجودة
    جوا shop.routes.js)
*/
router.use(verifyStore);
router.use(requirePermission("reviews"));

router.get("/stats", getRatingStats);
router.get("/", getRatings);
router.patch("/:id/approval", updateRatingApproval);
router.delete("/:id", deleteRating);

module.exports = router;

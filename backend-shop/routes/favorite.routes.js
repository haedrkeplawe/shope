const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const {
  getFavoritesOverview,
  notifyFavoriteDiscount,
} = require("../controllers/favorite.controller");

/*
  favorite.routes.js
  - مسارات صفحة "المفضلة" بلوحة تحكم الأدمن - مركبة على
    /api/admin/favorites (تحليل تجميعي لكل الزبائن، منفصلة كليًا عن
    /api/customers/favorites الخاصة بمفضلة الزبون الشخصية نفسه)
*/
router.use(verifyStore);

router.get("/", getFavoritesOverview);
router.post("/:productId/notify-discount", notifyFavoriteDiscount);

module.exports = router;

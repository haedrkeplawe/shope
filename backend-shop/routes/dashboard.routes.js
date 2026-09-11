const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getDashboardOverview,
  getSalesPerformance,
} = require("../controllers/dashboard.controller");

/*
  dashboard.routes.js
  - مسارات صفحة "لوحة التحكم" (الرئيسية) بلوحة تحكم الأدمن - مركبة على
    /api/admin/dashboard
*/
router.use(verifyStore);
router.use(requirePermission("dashboard"));

router.get("/overview", getDashboardOverview);
router.get("/sales-performance", getSalesPerformance);

module.exports = router;

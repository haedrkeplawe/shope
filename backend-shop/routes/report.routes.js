const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const { getReportsOverview } = require("../controllers/report.controller");

// كل راوتس التقارير محمية، محتاجة تسجيل دخول الأدمن
router.use(verifyStore);
router.use(requirePermission("reports"));

router.get("/overview", getReportsOverview);

module.exports = router;

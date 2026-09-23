const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getMembershipOverview,
  updateMembershipTier,
  getCustomerOptions,
  getTierMembers,
  getRecentSubscribers,
  assignCustomerTier,
} = require("../controllers/adminMembership.controller");

/*
  adminMembership.routes.js
  - مسارات صفحة "العضويات والاشتراكات" بلوحة تحكم الأدمن - مركبة على
    /api/admin/memberships (شوف server.js)
  - محمية بصلاحية "memberships" (مضافة أصلاً بنظام الصلاحيات - شوف
    utils/permissions.js) - قابلة للتفويض لموظف متل باقي أقسام النظام
*/
router.use(verifyStore);
router.use(requirePermission("memberships"));

router.get("/", getMembershipOverview);
router.get("/customer-options", getCustomerOptions);
router.get("/recent-subscribers", getRecentSubscribers);
router.get("/:tierKey/members", getTierMembers);
router.patch("/assign", assignCustomerTier);
router.patch("/:tierKey", updateMembershipTier);

module.exports = router;

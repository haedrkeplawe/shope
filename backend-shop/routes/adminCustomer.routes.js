const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getCustomerStats,
  getCustomers,
  getCustomerById,
  updateCustomerStatus,
} = require("../controllers/adminCustomer.controller");

/*
  adminCustomer.routes.js
  - مسارات إدارة العملاء من لوحة تحكم الأدمن - مركبة على
    /api/admin/customers (منفصلة كليًا عن /api/customers الخاصة بحساب
    الزبون نفسه - customer.routes.js)
*/
router.use(verifyStore);
router.use(requirePermission("customers"));

router.get("/stats", getCustomerStats);
router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.patch("/:id/status", updateCustomerStatus);

module.exports = router;

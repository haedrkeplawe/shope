const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requirePermission } = require("../middleware/authorize");
const {
  getCustomerOptions,
  getMarketerStats,
  getMarketers,
  assignMarketer,
  getMarketerById,
  updateMarketer,
  unassignMarketer,
} = require("../controllers/adminMarketer.controller");

/*
  adminMarketer.routes.js
  - مسارات إدارة "التسويق بالعمولة" من لوحة تحكم الأدمن - مركبة على
    /api/admin/marketers

  ⚠️ ملاحظة عن الترتيب: /customer-options و /stats لازم يتسجّلو *قبل*
  /:id بالضبط - وإلا Express بيطابقهم غلط مع /:id (ويعتبر "stats" أو
  "customer-options" معرّف مسوّق فعلي) - نفس مبدأ ترتيب راوتس الكوبون
  بالضبط (customer.routes.js)
*/
router.use(verifyStore);
router.use(requirePermission("marketers"));

router.get("/customer-options", getCustomerOptions);
router.get("/stats", getMarketerStats);
router.get("/", getMarketers);
router.post("/", assignMarketer);
router.get("/:id", getMarketerById);
router.patch("/:id", updateMarketer);
router.delete("/:id", unassignMarketer);

module.exports = router;

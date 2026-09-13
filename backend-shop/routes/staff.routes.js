const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requireOwner } = require("../middleware/authorize");
const {
  getStaffList,
  createStaff,
  updateStaff,
  deleteStaff,
} = require("../controllers/staff.controller");

/*
  staff.routes.js
  ------------------------------------------------------------------
  إدارة حسابات الموظفين/المساعدين - محصورة بحساب المالك حصرًا، بلا أي
  استثناء (requireOwner، شوف شرحه الكامل بـ middleware/authorize.js).
  عن قصد ما فيها نظام صلاحيات فرعي: موظف ما بيقدر يدير موظفين تانيين
  أبدًا، مهما كانت صلاحياته - منعًا لترقية الصلاحيات الذاتية
*/
router.use(verifyStore, requireOwner);

router.get("/", getStaffList);
router.post("/", createStaff);
router.patch("/:id", updateStaff);
router.delete("/:id", deleteStaff);

module.exports = router;

// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const {
  createOrder,
  getMyOrders,
  getOrderById,
} = require("../controllers/order.controller");

// كل راوتس الطلبات بدها تسجيل دخول - نفس فلسفة الموقع بالكامل
router.use(verifyCustomer);

router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);

module.exports = router;

const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const {
  createStore,
  getStore,
  updateStore,
  updateStoreStatus,
  loginStore,
  verifyOtp,
  resendOtp,
  getMe,
  logout,
} = require("../controllers/store.controller");

/* -------------------- بيانات المتجر (سجل واحد فقط) -------------------- */
router.post("/", createStore);
router.get("/", getStore);
router.patch("/", verifyStore, updateStore);
router.patch("/status", verifyStore, updateStoreStatus);

/* -------------------- تسجيل الدخول (هاتف + كلمة مرور + OTP) -------------------- */
router.post("/login", loginStore);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/logout", logout);

/* -------------------- الجلسة الحالية -------------------- */
router.get("/me", verifyStore, getMe);

module.exports = router;

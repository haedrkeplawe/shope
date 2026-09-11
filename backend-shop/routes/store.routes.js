const express = require("express");
const router = express.Router();

const verifyStore = require("../middleware/verifyStore");
const { requireOwner, requirePermission } = require("../middleware/authorize");
const createUploader = require("../middleware/uploadImage");
const {
  createStore,
  getStore,
  updateStore,
  updateStoreStatus,
  changePassword,
  updateAvatar,
  loginStore,
  verifyOtp,
  resendOtp,
  getMe,
  logout,
} = require("../controllers/store.controller");

const uploadStoreAvatar = createUploader("avatars");

/* -------------------- بيانات المتجر (سجل واحد فقط) -------------------- */
router.post("/", createStore);
router.get("/", getStore);
// تعديل بيانات المتجر العامة (اسم، إيميل، هاتف، نبذة) - صلاحية قابلة
// للتفويض ("settings") بعكس باقي راوتس هالملف تحت
router.patch("/", verifyStore, requirePermission("settings"), updateStore);
// إيقاف/تفعيل المتجر بالكامل - إجراء جذري، حصري على المالك دايمًا
router.patch("/status", verifyStore, requireOwner, updateStoreStatus);

/* -------------------- الملف الشخصي (حساب المالك حصرًا) --------------------
   ⚠️ كلمة مرور وصورة حساب المالك نفسه - حصرية عليه، مش صلاحية قابلة
   للتفويض إطلاقًا مهما كانت صلاحيات الموظف (شوف requireOwner بـ
   middleware/authorize.js) */
router.patch("/password", verifyStore, requireOwner, changePassword);
router.patch(
  "/avatar",
  verifyStore,
  requireOwner,
  uploadStoreAvatar.single("avatar"),
  updateAvatar,
);

/* -------------------- تسجيل الدخول (هاتف + كلمة مرور + OTP) --------------------
   موحّد لحساب المالك (Store) وحسابات الموظفين (Staff) سوا - شوف
   findAccountByPhone بـ store.controller.js */
router.post("/login", loginStore);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/logout", logout);

/* -------------------- الجلسة الحالية -------------------- */
router.get("/me", verifyStore, getMe);

module.exports = router;

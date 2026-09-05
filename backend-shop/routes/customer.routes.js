// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const {
  registerCustomer,
  loginCustomer,
  verifyOtp,
  resendOtp,
  getMe,
  logout,
  getFavoriteIds,
  getFavorites,
  addFavorite,
  removeFavorite,
  getCart,
  getCartCount,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/customer.controller");

/* -------------------- إنشاء حساب -------------------- */
router.post("/register", registerCustomer);

/* -------------------- تسجيل الدخول (هاتف + كلمة مرور + OTP) -------------------- */
router.post("/login", loginCustomer);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/logout", logout);

/* -------------------- الجلسة الحالية -------------------- */
router.get("/me", verifyCustomer, getMe);

/* -------------------- المفضلة (Wishlist) -------------------- */
router.get("/favorites", verifyCustomer, getFavorites);
router.get("/favorites/ids", verifyCustomer, getFavoriteIds);
router.post("/favorites/:productId", verifyCustomer, addFavorite);
router.delete("/favorites/:productId", verifyCustomer, removeFavorite);

/* -------------------- سلة المشتريات (Cart) -------------------- */
router.get("/cart", verifyCustomer, getCart);
router.get("/cart/count", verifyCustomer, getCartCount);
router.post("/cart/:productId", verifyCustomer, addToCart);
router.patch("/cart/:productId", verifyCustomer, updateCartItem);
router.delete("/cart/:productId", verifyCustomer, removeCartItem);
router.delete("/cart", verifyCustomer, clearCart);

module.exports = router;

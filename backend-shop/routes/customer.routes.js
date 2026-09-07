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
  applyCoupon,
  removeCoupon,
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

/* -------------------- سلة المشتريات (Cart) --------------------
   ⚠️ ملاحظة مهمة: الإضافة (POST) بتصير بمعرّف المنتج (:productId) لأنها
   بتحدد نفسها لحالها لو في سطر مطابق (نفس المنتج + المقاس + اللون) أو
   بتنشئ سطر جديد. لكن التعديل والحذف (PATCH/DELETE) بيصيرو بمعرّف السطر
   نفسه (:itemId) مش معرّف المنتج - لأنه بقى ممكن يتكرر نفس المنتج بأكتر
   من سطر بالسلة (مقاسات/ألوان مختلفة)، فمعرّف المنتج لحاله ما عاد كافي
   يحدد أي سطر بالضبط الزبون قاصده

   ⚠️ ملاحظة حرجة عن الترتيب: راوتس الكوبون (/cart/coupon) لازم تتسجّل
   *قبل* /cart/:productId بالضبط زي ما هي تحت - Express بيطابق الراوتس
   بترتيب تسجيلها بالكود، فلو /cart/:productId كانت مسجّلة قبلها، أي
   POST لـ /cart/coupon كان رح ينلقط غلط من /cart/:productId (وياخد
   "coupon" كأنه productId فعلي، فيرجع "معرّف منتج غير صالح" بدل ما يوصل
   لمنطق الكوبون أبدًا) - هاد بالضبط السبب لو ظهرت هاي المشكلة سابقًا */
router.get("/cart", verifyCustomer, getCart);
router.get("/cart/count", verifyCustomer, getCartCount);
router.post("/cart/coupon", verifyCustomer, applyCoupon);
router.delete("/cart/coupon", verifyCustomer, removeCoupon);
router.post("/cart/:productId", verifyCustomer, addToCart);
router.patch("/cart/item/:itemId", verifyCustomer, updateCartItem);
router.delete("/cart/item/:itemId", verifyCustomer, removeCartItem);
router.delete("/cart", verifyCustomer, clearCart);

module.exports = router;

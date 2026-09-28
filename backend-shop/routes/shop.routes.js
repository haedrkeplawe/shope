// user
const express = require("express");
const router = express.Router();

const verifyCustomer = require("../middleware/verifyCustomer");
const attachCustomerIfPresent = require("../middleware/attachCustomerIfPresent");
const {
  getNewArrivals,
  getMainCategories,
  getPieceTypes,
  getTestimonials,
  getShippingZones,
  getShopProducts,
  getShopFilters,
  getProductById,
  getRelatedProducts,
  submitRating,
  getMyRating,
  getProductRatings,
  getEarlyAccessProducts,
  getMembershipTiersForCustomer,
  getCartPreview,
} = require("../controllers/shop.controller");

/*
  ⚠️ تحديث جذري (تصفح بدون تسجيل دخول): المتجر بقى مفتوح بالكامل للزائر -
  attachCustomerIfPresent بيتعرف على الزبون لو موجود فعليًا (عشان خصم
  عضويته، حجب/إظهار منتجات "للأعضاء فقط"، تقييمه الشخصي...) من غير ما
  يرفض الطلب أبدًا لو مش مسجل دخول - عكس verifyCustomer القديمة. تسجيل
  الدخول الفعلي بقى مطلوب بس لحظة "إضافة تقييم" (submitRating تحت،
  مربوطة بحساب حقيقي دائمًا) - وطبعًا لحظة السلة الحقيقية/الطلب
  (customer.routes.js / order.routes.js، ما تغيّروا إطلاقًا)
*/
router.use(attachCustomerIfPresent);

router.get("/new-arrivals", getNewArrivals);
router.get("/categories", getMainCategories);
router.get("/piece-types", getPieceTypes);
router.get("/testimonials", getTestimonials);

/* -------------------- عضوية الولاء -------------------- */
router.get("/early-access", getEarlyAccessProducts);
router.get("/membership-tiers", getMembershipTiersForCustomer);

/* -------------------- مناطق الشحن (لصفحة الدفع) -------------------- */
router.get("/shipping-zones", getShippingZones);

/* -------------------- صفحة المتجر الكاملة -------------------- */
router.get("/products", getShopProducts);
router.get("/filters", getShopFilters);

router.get("/products/:id", getProductById);
router.get("/products/:id/related", getRelatedProducts);

/* -------------------- التقييمات (Ratings) -------------------- */
router.get("/products/:id/rating/me", getMyRating);
router.get("/products/:id/rating/list", getProductRatings);
// ⚠️ الوحيدة براوتس المتجر يلي لازم تسجيل دخول فعلي - إضافة تقييم فعل
// شخصي لازم يكون مربوط بحساب حقيقي (compound index على customerId
// بموديل Rating) - عكس باقي راوتس المتجر يلي بتشتغل للزائر بلا مشكلة
router.post("/products/:id/rating", verifyCustomer, submitRating);

/*
  -------------------- معاينة سلة الزائر (بدون تسجيل دخول) --------------------
  ⚠️ سلة الزائر نفسها عايشة بالكامل بمتصفحه (localStorage - شوف
  utils/guestCart.js بالفرونت)، هون بس بنحسبلها نفس تسعير سلة الزبون
  المسجل بالضبط (utils/serializeCart.js نفسها بالحرف) لحظيًا - شوف شرح
  كامل بـ getCartPreview بالكنترولر
*/
router.post("/cart/preview", getCartPreview);

module.exports = router;

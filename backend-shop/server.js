require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");
const {
  seedUncategorizedCategory,
  seedAdvancedFilters,
  backfillRatingApprovalStatus,
  seedMembershipTiers,
  backfillProductPublishedAt,
  syncCustomerIndexes,
} = require("./utils/seedDefaults");

connectDB().then(async () => {
  // ⚠️ أول خطوة عن قصد - قبل أي seed/backfill تاني، عشان نضمن فهارس
  // Customer صحيحة قبل أي عملية تسجيل حساب محتملة (شوف شرح كامل بـ
  // utils/seedDefaults.js → syncCustomerIndexes)
  await syncCustomerIndexes();
  await seedUncategorizedCategory();
  await seedAdvancedFilters();
  await backfillRatingApprovalStatus();
  await seedMembershipTiers();
  await backfillProductPublishedAt();
});

const app = express();

/* -------------------- Security -------------------- */
// crossOriginResourcePolicy معطّلة عشان الصور المرفوعة (uploads) تقدر تتحمّل
// من الفرونت إند اللي شغّال على بورت مختلف (3000)
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://shope-z9xu.onrender.com",
      "https://shope-user.onrender.com",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

/* -------------------- ملفات مرفوعة (صور الفئات والمنتجات...) -------------------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------- Routes -------------------- */
app.use("/api/store", require("./routes/store.routes.js"));
// إدارة حسابات الموظفين/المساعدين - محصورة بحساب المالك حصرًا (شوف شرح
// requireOwner بـ middleware/authorize.js)
app.use("/api/staff", require("./routes/staff.routes.js"));
app.use("/api/categories", require("./routes/category.routes.js"));
app.use("/api/products", require("./routes/product.routes.js"));
app.use("/api/advanced-filters", require("./routes/advancedFilter.routes.js"));
app.use("/api/offers", require("./routes/offer.routes.js"));
app.use("/api/coupons", require("./routes/coupon.routes.js"));
// مناطق الشحن - إدارة الأدمن الكاملة (CRUD) - القراءة العامة للزبون
// (المناطق النشطة بس) متاحة عبر /api/shop/shipping-zones بدل هيك
app.use("/api/shipping-zones", require("./routes/shippingZone.routes.js"));
app.use("/api/customers", require("./routes/customer.routes.js"));
app.use("/api/shop", require("./routes/shop.routes.js"));
app.use("/api/orders", require("./routes/order.routes.js"));
// إشعارات الزبون (الجرس بالهيدر + صفحة "الإشعارات") - محمية بحساب زبون
app.use("/api/notifications", require("./routes/notification.routes.js"));

/* -------------------- لوحة تحكم الأدمن: الطلبات / العملاء / التقييمات / التقارير -------------------- */
// لوحة التحكم الرئيسية (الصفحة الأولى بعد تسجيل الدخول) - نظرة عامة + رسم أداء المبيعات
app.use("/api/admin/dashboard", require("./routes/dashboard.routes.js"));
app.use("/api/admin/orders", require("./routes/adminOrder.routes.js"));
app.use("/api/admin/customers", require("./routes/adminCustomer.routes.js"));
// التسويق بالعمولة (المسوّقين) - إدارة كاملة من لوحة تحكم الأدمن
app.use("/api/admin/marketers", require("./routes/adminMarketer.routes.js"));
app.use("/api/admin/ratings", require("./routes/adminRating.routes.js"));
app.use("/api/admin/reports", require("./routes/report.routes.js"));
// تحليلات "المفضلة" (أكثر المنتجات حفظًا + إشعار خصم) - لوحة تحكم الأدمن
app.use("/api/admin/favorites", require("./routes/favorite.routes.js"));
// "السلات المتروكة" (تذكير / كوبون استرداد) - لوحة تحكم الأدمن
app.use(
  "/api/admin/abandoned-carts",
  require("./routes/abandonedCart.routes.js"),
);
// العضويات والاشتراكات (باقات الولاء الثلاث الثابتة) - لوحة تحكم الأدمن
app.use(
  "/api/admin/memberships",
  require("./routes/adminMembership.routes.js"),
);

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

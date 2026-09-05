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
} = require("./utils/seedDefaults");

connectDB().then(async () => {
  await seedUncategorizedCategory();
  await seedAdvancedFilters();
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
app.use("/api/categories", require("./routes/category.routes.js"));
app.use("/api/products", require("./routes/product.routes.js"));
app.use("/api/advanced-filters", require("./routes/advancedFilter.routes.js"));
app.use("/api/offers", require("./routes/offer.routes.js"));
app.use("/api/customers", require("./routes/customer.routes.js"));
app.use("/api/shop", require("./routes/shop.routes.js"));
app.use("/api/orders", require("./routes/order.routes.js"));

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import PagePlaceholder from "./components/PagePlaceholder";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import CategoryForm from "./pages/CategoryForm";
import ProductForm from "./pages/Productform";
import Products from "./pages/Products";
import AdvancedFilters from "./pages/AdvancedFilters";
import Inventory from "./pages/Inventory";
import Deals from "./pages/Deals";
import OfferForm from "./pages/OfferForm";
import Coupons from "./pages/Coupons";
import CouponForm from "./pages/CouponForm";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import ShippingZones from "./pages/ShippingZones";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Reviews from "./pages/Reviews";
import Favorites from "./pages/Favorites";
import AbandonedCarts from "./pages/AbandonedCarts";
import Marketers from "./pages/Marketers";
import MarketerDetail from "./pages/MarketerDetail";
import { NAV_ITEMS } from "./constants/navItems";

// المسارات اللي بقى ليها صفحة حقيقية بدل الصفحة الفارغة المؤقتة
const IMPLEMENTED_PATHS = [
  "/",
  "/categories",
  "/products",
  "/advanced-filters",
  "/inventory",
  "/deals",
  "/coupons",
  "/orders",
  "/customers",
  "/reviews",
  "/shipping",
  "/reports",
  "/favorites",
  "/abandoned-carts",
  "/affiliate-marketing",
];

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {/* صفحات تسجيل الدخول - ممنوعة على المستخدم المسجل دخوله بالفعل */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
        </Route>

        {/* لوحة التحكم - محمية، ما حدا يدخلها غير لو مسجل دخول */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* لوحة التحكم الرئيسية - صفحة حقيقية */}
            <Route path="/" element={<Dashboard />} />

            {/* الأقسام والفئات - صفحة حقيقية */}
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/new" element={<CategoryForm />} />
            <Route path="/categories/:id/edit" element={<CategoryForm />} />

            {/* ويزارد إضافة/تعديل منتج + صفحة قائمة المنتجات - كلهم حقيقيين دلوقتي */}
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id/edit" element={<ProductForm />} />

            {/* إدارة الفلاتر المتقدمة - صفحة حقيقية */}
            <Route path="/advanced-filters" element={<AdvancedFilters />} />

            {/* المخزون وحالة القطع - صفحة حقيقية */}
            <Route path="/inventory" element={<Inventory />} />

            {/* العروض والتخفيضات - صفحة حقيقية */}
            <Route path="/deals" element={<Deals />} />
            <Route path="/deals/new" element={<OfferForm />} />
            <Route path="/deals/:id/edit" element={<OfferForm />} />

            {/* الكوبونات - صفحة حقيقية */}
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/coupons/new" element={<CouponForm />} />
            <Route path="/coupons/:id/edit" element={<CouponForm />} />

            {/* الطلبات - صفحة حقيقية */}
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />

            {/* العملاء - صفحة حقيقية */}
            <Route path="/customers" element={<Customers />} />

            {/* التقييمات والتعليقات - صفحة حقيقية */}
            <Route path="/reviews" element={<Reviews />} />

            {/* الشحن والتوصيل - صفحة حقيقية (مناطق الشحن وأسعارها) */}
            <Route path="/shipping" element={<ShippingZones />} />

            {/* التقارير والتحليلات - صفحة حقيقية */}
            <Route path="/reports" element={<Reports />} />

            {/* المفضلة - صفحة حقيقية (تحليل أكثر المنتجات حفظًا) */}
            <Route path="/favorites" element={<Favorites />} />

            {/* السلات المتروكة - صفحة حقيقية (تذكير/كوبون استرداد) */}
            <Route path="/abandoned-carts" element={<AbandonedCarts />} />

            {/* التسويق بالعمولة - صفحة حقيقية (قائمة المسوّقين + تفاصيل كل مسوّق) */}
            <Route path="/affiliate-marketing" element={<Marketers />} />
            <Route
              path="/affiliate-marketing/:id"
              element={<MarketerDetail />}
            />

            {/* باقي عناصر القائمة - لسه صفحات فارغة مؤقتة */}
            {NAV_ITEMS.filter(
              ({ path }) => !IMPLEMENTED_PATHS.includes(path),
            ).map(({ path, label }) => (
              <Route
                key={path}
                path={path}
                element={<PagePlaceholder title={label} />}
              />
            ))}
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;

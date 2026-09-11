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
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Memberships from "./pages/Memberships";
import RequirePermission from "./components/RequirePermission";
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
  "/settings",
  "/memberships",
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
            <Route
              path="/"
              element={
                <RequirePermission permissionKey="dashboard">
                  <Dashboard />
                </RequirePermission>
              }
            />

            {/* الأقسام والفئات - صفحة حقيقية */}
            <Route
              path="/categories"
              element={
                <RequirePermission permissionKey="categories">
                  <Categories />
                </RequirePermission>
              }
            />
            <Route
              path="/categories/new"
              element={
                <RequirePermission permissionKey="categories">
                  <CategoryForm />
                </RequirePermission>
              }
            />
            <Route
              path="/categories/:id/edit"
              element={
                <RequirePermission permissionKey="categories">
                  <CategoryForm />
                </RequirePermission>
              }
            />

            {/* ويزارد إضافة/تعديل منتج + صفحة قائمة المنتجات - كلهم حقيقيين دلوقتي */}
            <Route
              path="/products"
              element={
                <RequirePermission permissionKey="products">
                  <Products />
                </RequirePermission>
              }
            />
            <Route
              path="/products/new"
              element={
                <RequirePermission permissionKey="products">
                  <ProductForm />
                </RequirePermission>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <RequirePermission permissionKey="products">
                  <ProductForm />
                </RequirePermission>
              }
            />

            {/* إدارة الفلاتر المتقدمة - صفحة حقيقية */}
            <Route
              path="/advanced-filters"
              element={
                <RequirePermission permissionKey="advancedFilters">
                  <AdvancedFilters />
                </RequirePermission>
              }
            />

            {/* المخزون وحالة القطع - صفحة حقيقية (نفس مفتاح "المنتجات"
                بالضبط - شوف ملاحظة utils/permissions.js بالباك إند) */}
            <Route
              path="/inventory"
              element={
                <RequirePermission permissionKey="products">
                  <Inventory />
                </RequirePermission>
              }
            />

            {/* العروض والتخفيضات - صفحة حقيقية */}
            <Route
              path="/deals"
              element={
                <RequirePermission permissionKey="deals">
                  <Deals />
                </RequirePermission>
              }
            />
            <Route
              path="/deals/new"
              element={
                <RequirePermission permissionKey="deals">
                  <OfferForm />
                </RequirePermission>
              }
            />
            <Route
              path="/deals/:id/edit"
              element={
                <RequirePermission permissionKey="deals">
                  <OfferForm />
                </RequirePermission>
              }
            />

            {/* الكوبونات - صفحة حقيقية */}
            <Route
              path="/coupons"
              element={
                <RequirePermission permissionKey="coupons">
                  <Coupons />
                </RequirePermission>
              }
            />
            <Route
              path="/coupons/new"
              element={
                <RequirePermission permissionKey="coupons">
                  <CouponForm />
                </RequirePermission>
              }
            />
            <Route
              path="/coupons/:id/edit"
              element={
                <RequirePermission permissionKey="coupons">
                  <CouponForm />
                </RequirePermission>
              }
            />

            {/* الطلبات - صفحة حقيقية */}
            <Route
              path="/orders"
              element={
                <RequirePermission permissionKey="orders">
                  <Orders />
                </RequirePermission>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequirePermission permissionKey="orders">
                  <OrderDetail />
                </RequirePermission>
              }
            />

            {/* العملاء - صفحة حقيقية */}
            <Route
              path="/customers"
              element={
                <RequirePermission permissionKey="customers">
                  <Customers />
                </RequirePermission>
              }
            />

            {/* التقييمات والتعليقات - صفحة حقيقية */}
            <Route
              path="/reviews"
              element={
                <RequirePermission permissionKey="reviews">
                  <Reviews />
                </RequirePermission>
              }
            />

            {/* الشحن والتوصيل - صفحة حقيقية (مناطق الشحن وأسعارها) */}
            <Route
              path="/shipping"
              element={
                <RequirePermission permissionKey="shipping">
                  <ShippingZones />
                </RequirePermission>
              }
            />

            {/* التقارير والتحليلات - صفحة حقيقية */}
            <Route
              path="/reports"
              element={
                <RequirePermission permissionKey="reports">
                  <Reports />
                </RequirePermission>
              }
            />

            {/* المفضلة - صفحة حقيقية (تحليل أكثر المنتجات حفظًا) */}
            <Route
              path="/favorites"
              element={
                <RequirePermission permissionKey="favorites">
                  <Favorites />
                </RequirePermission>
              }
            />

            {/* السلات المتروكة - صفحة حقيقية (تذكير/كوبون استرداد) */}
            <Route
              path="/abandoned-carts"
              element={
                <RequirePermission permissionKey="abandonedCarts">
                  <AbandonedCarts />
                </RequirePermission>
              }
            />

            {/* التسويق بالعمولة - صفحة حقيقية (قائمة المسوّقين + تفاصيل كل مسوّق) */}
            <Route
              path="/affiliate-marketing"
              element={
                <RequirePermission permissionKey="marketers">
                  <Marketers />
                </RequirePermission>
              }
            />
            <Route
              path="/affiliate-marketing/:id"
              element={
                <RequirePermission permissionKey="marketers">
                  <MarketerDetail />
                </RequirePermission>
              }
            />

            {/* العضويات والاشتراكات - صفحة حقيقية */}
            <Route
              path="/memberships"
              element={
                <RequirePermission permissionKey="memberships">
                  <Memberships />
                </RequirePermission>
              }
            />

            {/* الإعدادات - صفحة حقيقية (تبويب "عام" قابل للتفويض، تبويب
                "الأدوار" حصري على المالك - شوف Settings.jsx) */}
            <Route
              path="/settings"
              element={
                <RequirePermission permissionKey="settings">
                  <Settings />
                </RequirePermission>
              }
            />

            {/* الملف الشخصي - صفحة حقيقية، عن قصد مش جزء من NAV_ITEMS
                (بتتفتح من أيقونة المستخدم بالـ TopBar، مش من القائمة).
                ⚠️ حصرية على المالك تمامًا (ownerOnly) - بيانات/كلمة مرور
                حساب المالك الشخصية، مش موضوع صلاحيات بالأساس */}
            <Route
              path="/profile"
              element={
                <RequirePermission ownerOnly>
                  <Profile />
                </RequirePermission>
              }
            />

            {/* باقي عناصر القائمة - لسه صفحات فارغة مؤقتة، بس برضو محمية
                بنفس مفتاح صلاحيتها (permissionKey) عشان لو موظف كتب
                رابطها يدويًا ما يشوفها من غير صلاحية */}
            {NAV_ITEMS.filter(
              ({ path }) => !IMPLEMENTED_PATHS.includes(path),
            ).map(({ path, label, permissionKey }) => (
              <Route
                key={path}
                path={path}
                element={
                  <RequirePermission permissionKey={permissionKey}>
                    <PagePlaceholder title={label} />
                  </RequirePermission>
                }
              />
            ))}
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;

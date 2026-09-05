import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import PagePlaceholder from "./components/PagePlaceholder";
import Categories from "./pages/Categories";
import CategoryForm from "./pages/CategoryForm";
import ProductForm from "./pages/Productform";
import Products from "./pages/Products";
import AdvancedFilters from "./pages/AdvancedFilters";
import Inventory from "./pages/Inventory";
import Deals from "./pages/Deals";
import OfferForm from "./pages/OfferForm";
import { NAV_ITEMS } from "./constants/navItems";

// المسارات اللي بقى ليها صفحة حقيقية بدل الصفحة الفارغة المؤقتة
const IMPLEMENTED_PATHS = [
  "/categories",
  "/products",
  "/advanced-filters",
  "/inventory",
  "/deals",
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

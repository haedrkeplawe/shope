// user
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Favorites from "./pages/Favorites";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrdersList from "./pages/OrdersList";
import OrderDetail from "./pages/OrderDetail";
import Account from "./pages/Account";
import ComingSoon from "./pages/ComingSoon";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import MainLayout from "./components/MainLayout";

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {/* صفحات ضيف - بدون هيدر، ممنوعة على الزبون المسجل دخوله بالفعل */}
        <Route element={<GuestRoute />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* كل محتوى الموقع - محمي، ومغلّف بالهيدر + القائمة (MainLayout) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />

            {/* روابط القائمة والهيدر - Placeholder لحد ما نبني كل صفحة فعليًا */}
            <Route path="/shop" element={<ComingSoon title="المتجر" />} />
            <Route path="/brands" element={<ComingSoon title="البراندات" />} />
            <Route path="/new" element={<ComingSoon title="جديدنا" />} />
            <Route path="/offers" element={<ComingSoon title="العروض" />} />
            <Route path="/account" element={<Account />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/wishlist" element={<Favorites />} />
            <Route
              path="/notifications"
              element={<ComingSoon title="الإشعارات" />}
            />
            <Route path="/search" element={<ComingSoon title="بحث" />} />
            <Route path="/product/:id" element={<ProductDetails />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;

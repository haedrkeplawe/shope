// user
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
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

            {/*
              صفحة المتجر الكاملة - نفس المكوّن (Shop) بيترسم لأربع روابط
              مختلفة، والفرق بينهم بس هو الفلتر الافتراضي المفعّل تلقائيًا
              وقت الوصول (preset) - شوف تعليق Shop.jsx للتفاصيل الكاملة:
              - "المتجر"/"البراندات": بدون أي فلتر بيانات (preset="none")
              - "جديدنا": فلتر "وصل حديثًا" (preset="new")
              - "العروض": فلتر "عروض وتخفيضات" (preset="offers")
            */}
            {/*
              key ثابتة ومختلفة لكل رابط - عشان React يعيد إنشاء الصفحة
              من الصفر (Remount) كل ما تنقّلنا بين هاي الأربع روابط عن
              طريق القائمة، حتى لو كانت من نفس المكوّن (Shop) بالضبط.
              بدون هاي الـkey، React بيكتفي بتحديث الـprops بس (preset)
              من غير ما يعيد تشغيل useEffect البذر الأول مرة تانية - يعني
              لو كنت بصفحة "المتجر" وضغطت "العروض" من القائمة مباشرة (من
              غير ما تطلع للرئيسية بينهم)، فلتر "عروض وتخفيضات" ما كان
              رح يتفعّل تلقائيًا لأنه أصلاً الصفحة ما بتنعاد من جديد
            */}
            <Route path="/shop" element={<Shop key="shop" preset="none" />} />
            <Route
              path="/brands"
              element={<Shop key="brands" preset="none" />}
            />
            <Route path="/new" element={<Shop key="new" preset="new" />} />
            <Route
              path="/offers"
              element={<Shop key="offers" preset="offers" />}
            />

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

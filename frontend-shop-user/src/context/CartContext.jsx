// user
import React, { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";
import { useAuth } from "./AuthContext";
import {
  getGuestCart,
  getGuestCartCount,
  addGuestCartItem,
  clearGuestCart,
} from "../utils/guestCart";

const CartContext = createContext(null);

/*
  CartProvider (سلة المشتريات)
  - نفس فلسفة FavoritesContext بالضبط: مصدر واحد لعدد قطع السلة (عداد
    أيقونة الهيدر) بيتحدّث لحظيًا من أي مكان بالموقع بدون إعادة جلب كامل
  - بيجيب بس العدد الإجمالي (خفيف) - محتويات السلة الكاملة بتنجلب لحالها
    بصفحة /cart نفسها وقت ما تنفتح فعليًا (نفس أسلوب صفحة المفضلة تمامًا)
  - addToCart: مستخدمة من صفحة تفاصيل المنتج (وأي مكان تاني بالمستقبل) -
    بتاخد المقاس واللون المختارين (لو المنتج بيدعمهم) وبترجع النتيجة
    (نجاح/فشل) عشان الصفحة تقدر توقف حالة تحميل الزر لو لزم
  - refreshCartCount: بتنادى من صفحة السلة نفسها بعد أي تعديل/حذف مباشر
    عليها، عشان بادج الهيدر يضل متزامن حتى لو التعديل ما مر من هالكونتكست

  ⚠️ تحديث الميزة الجديدة (تصفح بدون تسجيل دخول): زائر بلا حساب سلته
  عايشة بالكامل بمتصفحه (localStorage عبر utils/guestCart.js) - addToCart
  و cartCount هون بيتعاملوا شفافين مع الحالتين (زبون مسجل / زائر) من
  غير ما الصفحات المستدعية (ProductDetails, ProductCard...) تحتاج تعرف
  أو تفرّق أصلاً - نفس الاستدعاء بالضبط. صفحة السلة نفسها (Cart.jsx) هي
  الوحيدة يلي بتفرّق فعليًا بمصدر البيانات (شوف شرحها)

  mergeGuestCart: بتُستدعى مرة وحدة تلقائيًا فور نجاح تسجيل الدخول (من
  Login.jsx وVerifyotp.jsx) - بتنقل بنود سلة الزائر المحلية لحساب الزبون
  الحقيقي (POST /customers/cart/merge) وبعدها بتفضّي التخزين المحلي
  نهائيًا. لو الزبون أصلاً كان مسجل دخوله، أو ما كان عنده سلة زائر
  أصلاً، ما بتعمل أي شي (تجاهل صامت)
*/
export const CartProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCartCount = async () => {
    // زائر بلا حساب - العدد بيجي مباشرة من التخزين المحلي، بدون أي طلب
    // سيرفر (خفيف وفوري، نفس فلسفة العدّاد الخفيف أصلاً)
    if (!isAuthenticated) {
      setCartCount(getGuestCartCount());
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/customers/cart/count`, {
        credentials: "include",
      });

      if (!res.ok) {
        setCartCount(0);
        return;
      }

      const data = await res.json();
      setCartCount(data.count || 0);
    } catch (error) {
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchCartCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const addToCart = async (
    productId,
    { size = null, color = null, quantity = 1 } = {},
  ) => {
    // زائر بلا حساب - إضافة محلية فورية بدون أي طلب سيرفر (نفس منطق
    // مطابقة السطر - منتج+مقاس+لون - المستخدم بالباك اند بالضبط، شوف
    // utils/guestCart.js)
    if (!isAuthenticated) {
      const items = addGuestCartItem(productId, { size, color, quantity });
      setCartCount(items.reduce((sum, i) => sum + i.quantity, 0));
      toast.success("تمت الإضافة للسلة");
      return { success: true };
    }

    try {
      const res = await fetch(`${API_URL}/customers/cart/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, color, quantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذّرت الإضافة للسلة");
        return { success: false };
      }

      setCartCount(data.count || 0);
      toast.success(data.message || "تمت الإضافة للسلة");
      return { success: true };
    } catch (error) {
      toast.error("حدث خطأ، حاول مرة أخرى");
      return { success: false };
    }
  };

  // بتُستدعى مرة وحدة تلقائيًا فور نجاح تسجيل الدخول (Login.jsx/Verifyotp.jsx)
  // بعد ما تصير الجلسة (كوكي customerToken) مثبّتة فعليًا - شوف شرح كامل
  // بأعلى الملف
  const mergeGuestCart = async () => {
    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/customers/cart/merge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: guestItems }),
      });

      if (res.ok) {
        const data = await res.json();
        clearGuestCart();
        setCartCount(data.count || 0);
      }
    } catch (error) {
      // فشل الدمج (انقطاع اتصال...) - بنسيب سلة الزائر المحلية زي ما هي
      // بدل ما نضيّعها؛ الزبون لسه شايفها ويقدر يضيفها يدويًا، أو المحاولة
      // الجاية (تسجيل دخول تاني) رح تعيد المحاولة تلقائيًا من نفسها
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartCount,
        loading,
        addToCart,
        refreshCartCount: fetchCartCount,
        mergeGuestCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

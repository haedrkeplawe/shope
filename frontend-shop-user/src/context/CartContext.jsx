// user
import React, { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";
import { useAuth } from "./AuthContext";

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
*/
export const CartProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCartCount = async () => {
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

    if (!isAuthenticated) {
      setCartCount(0);
      setLoading(false);
      return;
    }

    fetchCartCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const addToCart = async (
    productId,
    { size = null, color = null, quantity = 1 } = {},
  ) => {
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

  return (
    <CartContext.Provider
      value={{
        cartCount,
        loading,
        addToCart,
        refreshCartCount: fetchCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

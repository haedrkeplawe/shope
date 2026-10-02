// user
import React, { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

/*
  FavoritesProvider (المفضلة)
  - Context عام بيحمل حالة المفضلة بكل الموقع بمكان واحد، عشان قلب أي
    كارد منتج (بأي صفحة) وعداد أيقونة الهيدر يضلوا متزامنين مع بعض
    فورًا بدون ما نعيد جلب البيانات من كل مكان
  - بيجيب بس IDs المفضلة (خفيفة) - مش المنتجات كاملة - القائمة الكاملة
    بتنجلب لحالها بصفحة /wishlist وقت ما تنفتح فعليًا
  - بيشتغل بس لو الزبون مسجل دخوله (تابع لـ AuthContext) - لو لسا
    بيحمّل بيانات الجلسة أو مش مسجل، بنعتبر المفضلة فاضية مؤقتًا
  - تحديث متفائل (optimistic): بنعدّل الحالة محليًا فورًا وقت الضغط،
    وبعدين بنرسل الطلب للسيرفر بالخلفية - لو فشل الطلب بنرجّع الحالة
    القديمة ونعرض رسالة خطأ

  ⚠️ تحديث الميزة الجديدة (تصفح بدون تسجيل دخول): المفضلة تبقى ميزة
  حصرية لحساب مسجل (مرتبطة بمستند Customer نفسه بالباك اند، عكس السلة
  يلي بقت تدعم زائر عبر localStorage - شوف CartContext.jsx). زائر بلا
  حساب بيضغط القلب بيشوف رسالة تدعوه لتسجيل الدخول بدل ما نرسل طلب أكيد
  رح يفشل (401) ونعرضله خطأ عام مش واضح السبب
*/
export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavoriteIds = async () => {
    try {
      const res = await fetch(`${API_URL}/customers/favorites/ids`, {
        credentials: "include",
      });

      if (!res.ok) {
        setFavoriteIds(new Set());
        return;
      }

      const data = await res.json();
      setFavoriteIds(new Set(data.ids || []));
    } catch (error) {
      setFavoriteIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ننتظر لحد ما AuthContext يخلص فحص الجلسة، عشان ما نطلق طلب
    // فاشل أكيد وقت ما لسا مش عارفين إذا الزبون مسجل دخوله أو لأ
    if (authLoading) return;

    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    fetchFavoriteIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const isFavorite = (productId) => favoriteIds.has(productId);

  const toggleFavorite = async (productId) => {
    // زائر بلا حساب - المفضلة تتطلب حساب دايمًا (عكس السلة)، فبنوضحله
    // هيك بدل ما نرسل طلب أكيد رح يفشل (401) ونعرض خطأ عام مش مفهوم
    if (!isAuthenticated) {
      toast.error("سجّل دخولك لإضافة القطع للمفضلة");
      return;
    }

    const wasFavorite = favoriteIds.has(productId);

    // تحديث فوري بالواجهة قبل ما ننتظر رد السيرفر
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(productId);
      else next.add(productId);
      return next;
    });

    try {
      const res = await fetch(`${API_URL}/customers/favorites/${productId}`, {
        method: wasFavorite ? "DELETE" : "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("فشل تحديث المفضلة");
    } catch (error) {
      // فشل الطلب - نرجّع الحالة القديمة زي ما كانت
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(productId);
        else next.delete(productId);
        return next;
      });
      toast.error("حدث خطأ، حاول مرة أخرى");
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoritesCount: favoriteIds.size,
        loading,
        isFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);

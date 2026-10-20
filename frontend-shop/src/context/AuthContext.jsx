import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

const AuthContext = createContext(null);

/*
  AuthProvider
  - عند فتح التطبيق، بيسأل الباك إند "GET /store/me" عشان يتأكد لو فيه جلسة شغالة
    (الكوكيز httpOnly مش قادرين نقراها من الفرونت مباشرة، فلازم نسأل السيرفر)
  - بيوفر: store (بيانات الحساب لو مسجل دخول)، loading، isAuthenticated، refetch، logout

  ⚠️ "store" هون بقى يمثّل أي حساب لوحة تحكم مسجل دخول - إما المالك
  (role: "store") أو موظف/مساعد (role: "staff"). خلّيت اسم المتغيّر
  "store" زي ما هو (بدل ريفاكتور تسمية شامل بكل الملفات يلي بتستخدمه -
  TopBar/Sidebar/Dashboard/Profile...) - بس شكله صار أغنى (role +
  permissions إضافيين). استخدم isOwner/hasPermission تحت بدل ما تتحقق
  من role يدويًا بكل مكان

  isOwner: true لو الحساب هو المالك (صلاحيات غير مشروطة دايمًا)
  hasPermission(key): المالك = true دايمًا لأي مفتاح. الموظف = بيتحقق
  من permissions[key] الجاية من /me (نفس المصدر يلي الباك إند بيتحقق منه
  فعليًا - هاد بس للعرض بالواجهة، الحماية الحقيقية بالباك إند)
*/
export const AuthProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API_URL}/store/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        setStore(null);
        return;
      }

      const data = await res.json();
      setStore(data.store);
    } catch (error) {
      setStore(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/store/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setStore(null);
    }
  };

  const isOwner = store?.role === "store";

  const hasPermission = (key) => {
    if (!store) return false;
    if (isOwner) return true; // صلاحيات غير مشروطة، بلا أي شرط
    return Boolean(store.permissions?.[key]);
  };

  return (
    <AuthContext.Provider
      value={{
        store,
        loading,
        isAuthenticated: !!store,
        isOwner,
        hasPermission,
        refetch: fetchMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

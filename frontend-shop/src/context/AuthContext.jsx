import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

const AuthContext = createContext(null);

/*
  AuthProvider
  - عند فتح التطبيق، بيسأل الباك إند "GET /store/me" عشان يتأكد لو فيه جلسة شغالة
    (الكوكيز httpOnly مش قادرين نقراها من الفرونت مباشرة، فلازم نسأل السيرفر)
  - بيوفر: store (بيانات المتجر لو مسجل دخول)، loading، isAuthenticated، refetch، logout
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

  return (
    <AuthContext.Provider
      value={{
        store,
        loading,
        isAuthenticated: !!store,
        refetch: fetchMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// user
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../config/api";

const AuthContext = createContext(null);

// مهل إعادة المحاولة لما يفشل فحص الجلسة بسبب عطل مؤقت (شوف fetchMe)
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  AuthProvider (زبون)
  - نفس منطق AuthContext بالأدمن بالضبط - بس بيسأل "GET /customers/me"
  - بيوفر: customer، loading، isAuthenticated، refetch، logout

  ⚠️ الجلسة عمرها طويل وبتتجدد لحالها بالسيرفر (شوف utils/customerSession.js
  بالباك إند)، فالزبون ما لازم يشوف صفحة الدخول إلا إذا السيرفر قال صراحة
  إنه ما في جلسة (أي رد 4xx: 401 منتهية، 403 معلّق). أما فشل الشبكة أو خطأ
  السيرفر (5xx، أو Render عم ينشر نسخة جديدة...) فمنعيد المحاولة كم مرة
  قبل ما نقرر - وإذا ضل فاشل منترك حالة الزبون متل ما هي، بدل ما نعتبره
  طلع من حسابه وهو فعليًا لسا جلسته صالحة
*/
export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const res = await fetch(`${API_URL}/customers/me`, {
            credentials: "include",
          });

          if (res.ok) {
            const data = await res.json();
            setCustomer(data.customer);
            return;
          }

          if (res.status < 500) {
            setCustomer(null);
            return;
          }
        } catch (error) {
          // فشل بالشبكة - منعيد المحاولة تحت
        }

        if (attempt < RETRY_DELAYS_MS.length) {
          await wait(RETRY_DELAYS_MS[attempt]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/customers/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCustomer(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        isAuthenticated: !!customer,
        refetch: fetchMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

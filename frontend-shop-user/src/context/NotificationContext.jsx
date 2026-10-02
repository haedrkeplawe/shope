// user
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../config/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

/*
  NotificationProvider (الإشعارات)
  ------------------------------------------------------------------
  Context عام بيحمل عدد الإشعارات غير المقروءة بكل الموقع بمكان واحد -
  نفس فلسفة FavoritesContext.jsx/CartContext.jsx بالضبط - عشان نقطة
  الجرس الحمراء بالهيدر تضل متزامنة فورًا مع صفحة "الإشعارات" نفسها من
  غير ما نحتاج نعيد جلب البيانات من كل مكان

  - بيجيب بس العدد (خفيف - GET /notifications/unread-count) - القائمة
    الكاملة بتنجلب لحالها بصفحة /notifications نفسها وقت ما تنفتح فعليًا
  - بيشتغل بس لو الزبون مسجل دخوله (تابع لـ AuthContext) - لو لسا بيحمّل
    بيانات الجلسة أو مش مسجل، بنعتبر عدد الإشعارات صفر مؤقتًا
  - refreshUnreadCount: بتنعاد لحظة فتح صفحة الإشعارات (عشان تتحدث فورًا
    وقت التصفح) وبعد "تحديد الكل كمقروء"/تحديد إشعار واحد كمقروء
*/
export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        credentials: "include",
      });

      if (!res.ok) {
        setUnreadCount(0);
        return;
      }

      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ننتظر لحد ما AuthContext يخلص فحص الجلسة، عشان ما نطلق طلب فاشل
    // أكيد وقت ما لسا مش عارفين إذا الزبون مسجل دخوله أو لأ
    if (authLoading) return;

    if (!isAuthenticated) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    refreshUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        hasUnread: unreadCount > 0,
        loading,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

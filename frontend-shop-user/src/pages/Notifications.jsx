// user
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiPackage,
  FiTag,
  FiGift,
  FiShoppingCart,
  FiCheck,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { useNotifications } from "../context/NotificationContext";

/*
  Notifications (صفحة "الإشعارات")
  ------------------------------------------------------------------
  بتعرض كل إشعارات الزبون (تحديث حالة طلب، خصم على منتج بمفضلته، وصول
  كوبون، تذكير سلة متروكة) - الأحدث أولًا. الضغط على أي إشعار غير مقروء
  بيعلّمه كمقروء تلقائيًا، وبيودّي الزبون لوجهته (link) لو موجودة

  ⚠️ NotificationProvider بيحمل بس "العدد" (لنقطة الجرس بالهيدر) - القائمة
  الكاملة بتتجلب هون بس، لحظة فتح الصفحة فعليًا
*/

// خريطة أيقونة + لون لكل نوع إشعار - نفس مبدأ الشارات المستخدم بباقي الموقع
const NOTIFICATION_STYLES = {
  order_status: { icon: FiPackage, bg: "#eff6ff", color: "#2563eb" },
  favorite_discount: { icon: FiTag, bg: "#fbe9ec", color: "#8f2f41" },
  coupon: { icon: FiGift, bg: "#fffbeb", color: "#d97706" },
  cart_reminder: { icon: FiShoppingCart, bg: "#fef2f2", color: "#dc2626" },
};

// وقت نسبي مبسّط ("منذ كذا") - بدون الحاجة لمكتبة خارجية
const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `منذ ${diffDays} أيام`;

  return date.toLocaleDateString("ar-EG");
};

const Notifications = () => {
  const navigate = useNavigate();
  const { refreshUnreadCount } = useNotifications() || {};
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      // تجاهل - هتضل الصفحة فاضية والزبون يقدر يعيد المحاولة بإعادة الفتح
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    // تحديث فوري بالواجهة قبل ما ننتظر رد السيرفر
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    refreshUnreadCount?.();

    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch (error) {
      // ما بنرجّع الحالة القديمة هون عن قصد - حتى لو فشل الطلب، تحديد
      // "كمقروء" مش عملية حساسة تستأهل تعقيد التراجع، وهتتصحح تلقائيًا
      // بأي مزامنة تالية للصفحة
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      refreshUnreadCount?.();

      try {
        await fetch(`${API_URL}/notifications/${notification.id}/read`, {
          method: "PATCH",
          credentials: "include",
        });
      } catch (error) {
        // نفس المنطق فوق - تحسين بسيط، مش لازم Rollback عند الفشل
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">الإشعارات</h1>
          <p className="notifications-subtitle">
            {unreadCount > 0 ? `${unreadCount} غير مقروءة` : "كل شيء مقروء"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notifications-mark-all-btn"
            onClick={handleMarkAllRead}
          >
            <FiCheck />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {loading ? (
        <div className="notifications-loading">جاري التحميل...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <FiBell size={32} />
          <p>لا توجد إشعارات حتى الآن</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const style =
              NOTIFICATION_STYLES[notification.type] ||
              NOTIFICATION_STYLES.order_status;
            const Icon = style.icon;

            return (
              <button
                type="button"
                key={notification.id}
                className={`notification-card ${
                  !notification.isRead ? "notification-card--unread" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {!notification.isRead && (
                  <span className="notification-unread-dot" />
                )}

                <div
                  className="notification-icon"
                  style={{ backgroundColor: style.bg, color: style.color }}
                >
                  <Icon />
                </div>

                <div className="notification-body">
                  <span className="notification-title">
                    {notification.title}
                  </span>
                  <span className="notification-message">
                    {notification.message}
                  </span>
                  <span className="notification-time">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;

import React from "react";
import { useNavigate } from "react-router-dom";
import { FiSettings, FiBell, FiUser, FiShoppingBag } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { getImageUrl } from "../config/api";

/*
  TopBar
  - شريط ثابت أعلى كل صفحات لوحة التحكم
  - أيقونة المستخدم مفعّلة وبتوجّه لصفحة "الملف الشخصي" (/profile) - لو
    عنده صورة شخصية مرفوعة بتظهر هون كمان بدل الأيقونة الجامدة
  - باقي الأزرار (الإعدادات، الإشعارات) لسه شكل جامد بس، مش مفعّلة
*/
const TopBar = () => {
  const { store } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-icons">
        <button
          type="button"
          className="topbar-icon-btn"
          onClick={() => navigate("/profile")}
          title="الملف الشخصي"
        >
          {store?.avatar ? (
            <img
              src={getImageUrl(store.avatar)}
              alt={store.fullName}
              className="topbar-avatar-img"
            />
          ) : (
            <FiUser />
          )}
        </button>
        <button type="button" className="topbar-icon-btn">
          <FiSettings />
        </button>
        <button
          type="button"
          className="topbar-icon-btn topbar-icon-btn--notif"
        >
          <FiBell />
          <span className="topbar-notif-dot" />
        </button>
      </div>

      <div className="topbar-brand">
        <span className="topbar-brand-name">{store?.storeName || "طراز"}</span>
        <span className="topbar-brand-icon">
          <FiShoppingBag />
        </span>
      </div>
    </header>
  );
};

export default TopBar;

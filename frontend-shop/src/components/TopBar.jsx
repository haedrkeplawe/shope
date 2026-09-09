import React from "react";
import { FiSettings, FiBell, FiUser, FiShoppingBag } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

/*
  TopBar
  - شريط ثابت أعلى كل صفحات لوحة التحكم
  - حاليًا شكل جامد فقط (الأزرار مش متفعّلة لسه)
*/
const TopBar = () => {
  const { store } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-icons">
        <button type="button" className="topbar-icon-btn">
          <FiUser />
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

// user
import React from "react";
import { Link } from "react-router-dom";
import { FiX, FiSearch } from "react-icons/fi";
import { SITE_NAV_ITEMS, HEADER_ICON_LINKS } from "../constants/siteNavItems";

/*
  MobileMenu
  - القائمة المنسدلة اللي بتفتح من زر الهامبرغر بالهيدر
  - ما فيها زرار "إنشاء حساب/تسجيل دخول" متل التصميم الأصلي - غير منطقي
    نعرضهم هون، لأنه الزبون أصلاً ما بيوصل لهاي القائمة إلا وهو مسجل
    دخول (كل الموقع محمي خلف تسجيل الدخول)
*/
const MobileMenu = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="mobile-menu-overlay">
      <div className="mobile-menu-header">
        {/* الشعار بنفس صف الأيقونات تمامًا زي التصميم الأصلي - مش صف منفصل */}
        <div className="mobile-menu-logo">
          <span className="mobile-menu-logo-main">MAISON</span>
          <span className="mobile-menu-logo-sub">RÉVA</span>
        </div>

        <div className="mobile-menu-icons">
          <Link
            to={HEADER_ICON_LINKS.search}
            className="mobile-menu-icon-btn"
            onClick={onClose}
            aria-label="بحث"
          >
            <FiSearch />
          </Link>

          <button
            type="button"
            className="mobile-menu-icon-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <FiX />
          </button>
        </div>
      </div>

      <nav className="mobile-menu-nav">
        {SITE_NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="mobile-menu-link"
            onClick={onClose}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default MobileMenu;

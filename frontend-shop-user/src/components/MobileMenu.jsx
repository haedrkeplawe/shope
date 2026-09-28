// user
import React from "react";
import { Link } from "react-router-dom";
import { FiX, FiSearch, FiLogIn, FiUserPlus } from "react-icons/fi";
import { SITE_NAV_ITEMS, HEADER_ICON_LINKS } from "../constants/siteNavItems";
import { useAuth } from "../context/AuthContext";

/*
  MobileMenu
  - القائمة المنسدلة اللي بتفتح من زر الهامبرغر بالهيدر
  - ⚠️ تحديث الميزة الجديدة (تصفح بدون تسجيل دخول): الموقع بقى عام
    بالكامل تصفحًا (الصفحات المُدرجة بـSITE_NAV_ITEMS كلها عامة)، فالزائر
    بقى فعليًا بيوصل لهاي القائمة عادي - لهيك أضفنا صف "تسجيل الدخول/
    إنشاء حساب" بالأسفل يظهر له بس (زبون مسجل دخوله أصلاً ما بيشوفه،
    لأنه مش منطقي إله)
  - item.state (لو موجودة بـ SITE_NAV_ITEMS) بتنمرّر زي ما هي لـ<Link> -
    تمريرة عابرة عبر react-router (زي "البراندات" يلي بتفتح درج فلاتر
    صفحة المتجر تلقائيًا على قسم الماركة) - مش موجودة لمعظم الروابط
*/
const MobileMenu = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();

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
            state={item.state}
            className="mobile-menu-link"
            onClick={onClose}
          >
            {item.label}
          </Link>
        ))}

        {!isAuthenticated && (
          <div className="mobile-menu-auth">
            <Link
              to="/login"
              className="mobile-menu-auth-btn mobile-menu-auth-btn--primary"
              onClick={onClose}
            >
              <FiLogIn /> تسجيل الدخول
            </Link>
            <Link
              to="/register"
              className="mobile-menu-auth-btn"
              onClick={onClose}
            >
              <FiUserPlus /> إنشاء حساب جديد
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

export default MobileMenu;

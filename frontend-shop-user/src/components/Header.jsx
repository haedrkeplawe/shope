// user
import React from "react";
import { Link } from "react-router-dom";
import {
  FiMenu,
  FiUser,
  FiShoppingBag,
  FiHeart,
  FiBell,
  FiSearch,
} from "react-icons/fi";
import { HEADER_ICON_LINKS } from "../constants/siteNavItems";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import { useNotifications } from "../context/NotificationContext";

/*
  Header
  - الشريط العلوي الثابت، بيظهر بكل صفحات الموقع بعد تسجيل الدخول (عبر MainLayout)
  - hasUnreadNotifications: بيضبط ظهور النقطة الحمراء عالجرس - بقى مربوط
    فعليًا بـ NotificationContext (بعد ما كان قيمة ثابتة false لعدم وجود
    نظام إشعارات فعلي وقتها) - بيتحدّث لحظيًا مع أي إشعار جديد يوصل
  - onMenuClick: بيفتح قائمة الموبايل (MobileMenu) - ممرّرة من MainLayout
  - عداد المفضلة (favoritesCount) وعداد السلة (cartCount) بيتحدّثوا لحظيًا
    من الـ Context الخاص فيهم، بدون أي حاجة نمررهم كـ props
*/
const Header = ({ onMenuClick }) => {
  const { favoritesCount } = useFavorites();
  const { cartCount } = useCart();
  const { hasUnread } = useNotifications() || {};

  return (
    <header className="site-header">
      <Link to="/" className="site-header-logo">
        <span className="site-header-logo-main">MAISON</span>
        <span className="site-header-logo-sub">RÉVA</span>
      </Link>

      <div className="site-header-icons">
        <button
          type="button"
          className="site-header-icon-btn"
          onClick={onMenuClick}
          aria-label="القائمة"
        >
          <FiMenu />
        </button>

        <Link
          to={HEADER_ICON_LINKS.account}
          className="site-header-icon-btn"
          aria-label="حسابي"
        >
          <FiUser />
        </Link>

        <Link
          to={HEADER_ICON_LINKS.cart}
          className="site-header-icon-btn"
          aria-label="سلة المشتريات"
        >
          <FiShoppingBag />
          {cartCount > 0 && (
            <span className="site-header-badge">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>

        <Link
          to={HEADER_ICON_LINKS.wishlist}
          className="site-header-icon-btn"
          aria-label="المفضلة"
        >
          <FiHeart />
          {favoritesCount > 0 && (
            <span className="site-header-badge">
              {favoritesCount > 99 ? "99+" : favoritesCount}
            </span>
          )}
        </Link>

        <Link
          to={HEADER_ICON_LINKS.notifications}
          className="site-header-icon-btn"
          aria-label="الإشعارات"
        >
          <FiBell />
          {hasUnread && <span className="site-header-dot" />}
        </Link>

        <Link
          to={HEADER_ICON_LINKS.search}
          className="site-header-icon-btn"
          aria-label="بحث"
        >
          <FiSearch />
        </Link>
      </div>
    </header>
  );
};

export default Header;

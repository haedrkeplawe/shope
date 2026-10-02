// user
import React from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiShoppingBag, FiSearch } from "react-icons/fi";
import { HEADER_ICON_LINKS } from "../constants/siteNavItems";
import { useCart } from "../context/CartContext";
import { useNotifications } from "../context/NotificationContext";
import BrandLogo from "./BrandLogo";

/*
  Header
  - الشريط العلوي الثابت، بيظهر بكل صفحات الموقع (عبر MainLayout)
  - التصميم الجديد (ترتيب العناصر بالـ DOM → أول عنصر أقصى اليمين بـ RTL):
      [زر القائمة]  [الشعار]  [بحث | سلة]
    الهيدر القديم كان فيه 6 أيقونات - هلأ 3 بس، والوظائف المنقولة:
    - المفضلة (+ عدّادها) وحسابي → الشريط السفلي (BottomNav)
    - الإشعارات (الجرس) → رابط داخل القائمة (MobileMenu) + نقطة حمراء
      هون على زر القائمة نفسه (hasUnread) عشان المستخدم يعرف إن في
      إشعار جديد بدون ما يفتح القائمة - نفس ربط NotificationContext
      القديم بالضبط، تحدّث لحظي مع أي إشعار جديد
  - onMenuClick: بيفتح قائمة الموبايل (MobileMenu) - ممرّرة من MainLayout
  - عداد السلة (cartCount) بيتحدّث لحظيًا من CartContext بدون props
*/
const Header = ({ onMenuClick }) => {
  const { cartCount } = useCart();
  const { hasUnread } = useNotifications() || {};

  return (
    <header className="site-header">
      <button
        type="button"
        className="site-header-icon-btn"
        onClick={onMenuClick}
        aria-label="القائمة"
      >
        <FiMenu />
        {hasUnread && <span className="site-header-dot" />}
      </button>

      <Link to="/" className="site-header-logo" aria-label="الرئيسية">
        <BrandLogo variant="dark" />
      </Link>

      <div className="site-header-icons">
        <Link
          to={HEADER_ICON_LINKS.search}
          className="site-header-icon-btn"
          aria-label="بحث"
        >
          <FiSearch />
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
      </div>
    </header>
  );
};

export default Header;

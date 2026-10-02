// user
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BOTTOM_NAV_ITEMS } from "../constants/siteNavItems";
import { useFavorites } from "../context/FavoritesContext";

/*
  BottomNav
  ------------------------------------------------------------------
  الشريط السفلي الثابت (جديد بالتصميم) - 5 تبويبات: الرئيسية، المتجر،
  المفضلة، السلة، حسابي. العناصر نفسها معرّفة بـ BOTTOM_NAV_ITEMS
  (constants/siteNavItems.js) - مصدر واحد للحقيقة زي باقي روابط الموقع

  - التبويب الفعّال بيتحدد من المسار الحالي (useLocation):
    - end: true → تطابق تام بس (الرئيسية)
    - غير هيك → المسار نفسه أو أي مسار بيبدأ فيه (مثلاً /product/12 تحت
      /product، و/account/membership تحت /account)
  - عدّاد المفضلة (favoritesCount) كان بالهيدر القديم - انتقل هون فوق
    أيقونة القلب، لحظي من FavoritesContext
  - عدّاد السلة ما حطيته هون قصدًا: التصميم بيعرضه بالهيدر بس
  - الشريط fixed بأسفل الشاشة، والفوتر معطي padding سفلي كافي عشان ما
    يغطّي عليه (شوف footer.css + المتغيّر --bottom-nav-height بـ header.css)
*/
const isActive = (item, pathname) => {
  if (item.end) return pathname === item.path;
  const paths = item.matchPaths || [item.path];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

const BottomNav = () => {
  const { pathname } = useLocation();
  const { favoritesCount } = useFavorites();

  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item, pathname);
        const count = item.badge === "favorites" ? favoritesCount : 0;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item${
              active ? " bottom-nav-item--active" : ""
            }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              <Icon />
              {count > 0 && (
                <span className="bottom-nav-badge">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;

// user
import { FiHome, FiShoppingBag, FiAward, FiGift, FiTag } from "react-icons/fi";

/*
  عناصر قائمة الموقع - مصدر واحد للحقيقة (Single Source of Truth)
  بيستخدمه MobileMenu لعرض روابط القائمة، وApp.js لتوليد الراوتات تلقائيًا
  بنفس نمط NAV_ITEMS بالأدمن بالضبط
*/
export const SITE_NAV_ITEMS = [
  { label: "الرئيسية", path: "/", icon: FiHome },
  { label: "المتجر", path: "/shop", icon: FiShoppingBag },
  { label: "البراندات", path: "/brands", icon: FiAward },
  { label: "جديدنا", path: "/new", icon: FiGift },
  { label: "العروض", path: "/offers", icon: FiTag },
];

/*
  روابط أيقونات الهيدر العلوي - كل وحدة بتودي لصفحة Placeholder حاليًا
*/
export const HEADER_ICON_LINKS = {
  account: "/account",
  cart: "/cart",
  wishlist: "/wishlist",
  notifications: "/notifications",
  search: "/search",
};

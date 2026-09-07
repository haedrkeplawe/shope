// user
import { FiHome, FiShoppingBag, FiAward, FiGift, FiTag } from "react-icons/fi";

/*
  عناصر قائمة الموقع - مصدر واحد للحقيقة (Single Source of Truth)
  بيستخدمه MobileMenu لعرض روابط القائمة، وApp.js لتوليد الراوتات تلقائيًا
  بنفس نمط NAV_ITEMS بالأدمن بالضبط

  - state (اختياري): تمريرة عابرة عبر react-router (location.state) بس
    لبعض الروابط يلي بتودّي لصفحة المتجر (/shop) بدون فلتر بيانات محدد
    (زي "البراندات" - مفيش ماركة واحدة نفترضها) - بتخلي صفحة المتجر تفتح
    درج الفلاتر تلقائيًا على القسم المناسب (شوف Shop.jsx). مش جزء من
    الرابط نفسه ومش فلتر حقيقي، فمقصود يبقى غير موجود لباقي الروابط
*/
export const SITE_NAV_ITEMS = [
  { label: "الرئيسية", path: "/", icon: FiHome },
  { label: "المتجر", path: "/shop", icon: FiShoppingBag },
  {
    label: "البراندات",
    path: "/brands",
    icon: FiAward,
    state: { openSection: "brand" },
  },
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

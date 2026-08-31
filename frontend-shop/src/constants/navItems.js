import {
  FiHome,
  FiClipboard,
  FiBox,
  FiGrid,
  FiSliders,
  FiArchive,
  FiUsers,
  FiHeart,
  FiShoppingCart,
  FiAward,
  FiTag,
  FiGift,
  FiShare2,
  FiStar,
  FiImage,
  FiBarChart2,
  FiTruck,
  FiBell,
  FiSettings,
  FiExternalLink,
} from "react-icons/fi";

/*
  عناصر الشريط الجانبي — مصدر واحد للحقيقة (Single Source of Truth)
  بيستخدمه الـ Sidebar لعرض القائمة، وبيستخدمه App.js لتوليد الراوتس تلقائيًا
*/
export const NAV_ITEMS = [
  { label: "الرئيسية", path: "/", icon: FiHome },
  { label: "الطلبات", path: "/orders", icon: FiClipboard, badge: 12 },
  { label: "المنتجات", path: "/products", icon: FiBox },
  { label: "الأقسام والفئات", path: "/categories", icon: FiGrid },
  { label: "الفلاتر المتقدمة", path: "/advanced-filters", icon: FiSliders },
  { label: "المخزون وحالة القطع", path: "/inventory", icon: FiArchive },
  { label: "العملاء", path: "/customers", icon: FiUsers },
  { label: "المفضلة", path: "/favorites", icon: FiHeart },
  { label: "السلات المتروكة", path: "/abandoned-carts", icon: FiShoppingCart },
  { label: "العضويات والاشتراكات", path: "/memberships", icon: FiAward },
  { label: "العروض والتخفيضات", path: "/deals", icon: FiTag },
  { label: "الكوبونات", path: "/coupons", icon: FiGift },
  { label: "التسويق بالعمولة", path: "/affiliate-marketing", icon: FiShare2 },
  { label: "التقييمات والتعليقات", path: "/reviews", icon: FiStar },
  { label: "المحتوى والإعلانات", path: "/content-ads", icon: FiImage },
  { label: "التقارير والتحليلات", path: "/reports", icon: FiBarChart2 },
  { label: "الشحن والتوصيل", path: "/shipping", icon: FiTruck },
  { label: "الإشعارات", path: "/notifications", icon: FiBell },
  { label: "الإعدادات", path: "/settings", icon: FiSettings },
  { label: "عرض المتجر", path: "/store-preview", icon: FiExternalLink },
];

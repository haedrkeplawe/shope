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

  ⚠️ permissionKey: نفس مفاتيح PERMISSION_KEYS بالضبط (utils/permissions.js
  بالباك إند) - الشريط الجانبي بيفلتر هالقائمة حسب صلاحيات الحساب المسجل
  دخوله (شوف Sidebar.jsx + AuthContext.jsx → hasPermission). المالك
  بيشوف كل شي دايمًا بغض النظر عن هالمفاتيح - الفلترة لموظفي Staff بس.
  "عرض المتجر" بلا permissionKey عن قصد - رابط خارجي للمتجر الحي، بلا أي
  حساسية أمنية، ظاهر للجميع دايمًا
*/
export const NAV_ITEMS = [
  { label: "الرئيسية", path: "/", icon: FiHome, permissionKey: "dashboard" },
  {
    label: "الطلبات",
    path: "/orders",
    icon: FiClipboard,
    badge: 12,
    permissionKey: "orders",
  },
  {
    label: "المنتجات",
    path: "/products",
    icon: FiBox,
    permissionKey: "products",
  },
  {
    label: "الأقسام والفئات",
    path: "/categories",
    icon: FiGrid,
    permissionKey: "categories",
  },
  {
    label: "الفلاتر المتقدمة",
    path: "/advanced-filters",
    icon: FiSliders,
    permissionKey: "advancedFilters",
  },
  {
    label: "المخزون وحالة القطع",
    path: "/inventory",
    icon: FiArchive,
    // ⚠️ نفس مفتاح "المنتجات" بالضبط - مربوطين بنفس route file بالباك
    // إند فعليًا (product.routes.js)، مقدرش نفصل صلاحياتهم حاليًا
    permissionKey: "products",
  },
  {
    label: "العملاء",
    path: "/customers",
    icon: FiUsers,
    permissionKey: "customers",
  },
  {
    label: "المفضلة",
    path: "/favorites",
    icon: FiHeart,
    permissionKey: "favorites",
  },
  {
    label: "السلات المتروكة",
    path: "/abandoned-carts",
    icon: FiShoppingCart,
    permissionKey: "abandonedCarts",
  },
  {
    label: "العضويات والاشتراكات",
    path: "/memberships",
    icon: FiAward,
    permissionKey: "memberships",
  },
  {
    label: "العروض والتخفيضات",
    path: "/deals",
    icon: FiTag,
    permissionKey: "deals",
  },
  {
    label: "الكوبونات",
    path: "/coupons",
    icon: FiGift,
    permissionKey: "coupons",
  },
  {
    label: "التسويق بالعمولة",
    path: "/affiliate-marketing",
    icon: FiShare2,
    permissionKey: "marketers",
  },
  {
    label: "التقييمات والتعليقات",
    path: "/reviews",
    icon: FiStar,
    permissionKey: "reviews",
  },
  {
    label: "المحتوى والإعلانات",
    path: "/content-ads",
    icon: FiImage,
    permissionKey: "contentAds",
  },
  {
    label: "التقارير والتحليلات",
    path: "/reports",
    icon: FiBarChart2,
    permissionKey: "reports",
  },
  {
    label: "الشحن والتوصيل",
    path: "/shipping",
    icon: FiTruck,
    permissionKey: "shipping",
  },
  {
    label: "الإشعارات",
    path: "/notifications",
    icon: FiBell,
    permissionKey: "notifications",
  },
  {
    label: "الإعدادات",
    path: "/settings",
    icon: FiSettings,
    permissionKey: "settings",
  },
  {
    label: "عرض المتجر",
    path: "/store-preview",
    icon: FiExternalLink,
    // بلا permissionKey عن قصد - شوف الشرح بالتعليق فوق
  },
];

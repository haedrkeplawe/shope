// user
import {
  FiHome,
  FiShoppingBag,
  FiAward,
  FiGift,
  FiTag,
  FiGrid,
  FiHeart,
  FiUser,
} from "react-icons/fi";

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
  روابط أيقونات الهيدر العلوي + الشريط السفلي + القائمة - كل وحدة بتودي
  لصفحتها الفعلية (أو Placeholder لحد ما تنبني)
*/
export const HEADER_ICON_LINKS = {
  account: "/account",
  cart: "/cart",
  wishlist: "/wishlist",
  notifications: "/notifications",
  search: "/search",
};

/*
  عناصر الشريط السفلي الثابت (BottomNav.jsx) - التصميم الجديد نقل
  "المفضلة" و"حسابي" من الهيدر لهون (الهيدر بقي فيه: القائمة، البحث،
  السلة بس). الترتيب بالمصفوفة = الترتيب بالـ DOM → أول عنصر بيطلع أقصى
  اليمين بصفحة RTL، مطابق للتصميم

  - end: true  → التبويب بيتفعّل فقط لما المسار يساوي path بالضبط
    (ضروري للرئيسية "/" وإلا رح تتفعّل مع كل الصفحات)
  - matchPaths (اختياري): مسارات إضافية بتخلّي التبويب فعّال - مثلاً
    تبويب "المتجر" بيضل فعّال وأنت بصفحة منتج أو "جديدنا" أو "العروض"
  - badge: "favorites" → بيعرض عدّاد المفضلة فوق الأيقونة (كان بالهيدر
    القديم - ما بدنا نفقد هالوظيفة بعد نقل زر القلب)
*/
export const BOTTOM_NAV_ITEMS = [
  { label: "الرئيسية", path: "/", icon: FiHome, end: true },
  {
    label: "المتجر",
    path: "/shop",
    icon: FiGrid,
    matchPaths: ["/shop", "/brands", "/new", "/offers", "/product"],
  },
  {
    label: "المفضلة",
    path: HEADER_ICON_LINKS.wishlist,
    icon: FiHeart,
    badge: "favorites",
  },
  {
    label: "السلة",
    path: HEADER_ICON_LINKS.cart,
    icon: FiShoppingBag,
    matchPaths: ["/cart", "/checkout"],
  },
  {
    label: "حسابي",
    path: HEADER_ICON_LINKS.account,
    icon: FiUser,
    matchPaths: ["/account", "/orders"],
  },
];

/*
  قائمة "تسوّق" بالفوتر (Footer.jsx) - بتتألف من 3 أجزاء بالترتيب:
  1) FOOTER_SHOP_LINKS: روابط ثابتة (وصل حديثاً)
  2) الأقسام الرئيسية (رجالي/نسائي...) - ديناميكية من /shop/categories
     (نفس بيانات قسم "اختر ما تبحث عنه" بالرئيسية، بكاش مشترك)
  3) FOOTER_LINKS: الصفحات التعريفية (من نحن/الشروط/الخصوصية) - كل وحدة
     بتودي لصفحة Placeholder (ComingSoon) لحد ما تُبنى فعليًا
*/
export const FOOTER_SHOP_LINKS = [{ label: "وصل حديثاً", path: "/new" }];

export const FOOTER_LINKS = [
  { label: "من نحن", path: "/about" },
  { label: "الشروط والأحكام", path: "/terms" },
  { label: "سياسة الخصوصية", path: "/privacy" },
];

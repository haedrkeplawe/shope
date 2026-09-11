/*
  utils/permissions.js
  ------------------------------------------------------------------
  المصدر الوحيد للحقيقة لأسماء موارد/صفحات النظام القابلة للتفويض
  لحسابات الموظفين (Staff) - نفس المفاتيح بالضبط مستخدمة بـ:

  1) حقول permissions بموديل Staff (models/staff.js) - مبنية ديناميكيًا
     من PERMISSION_KEYS تحت، مش مكرّرة يدويًا
  2) استدعاءات requirePermission("key") بكل route file إداري
     (middleware/authorize.js)
  3) شاشة "الأدوار" بالفرونت إند - عرض الـ checkboxes وشارات الصلاحيات

  ⚠️ لو ضفت مورد/صفحة جديدة للنظام لاحقًا وحبيت تخليها قابلة للتفويض،
  الخطوات: (أ) ضيف مفتاحها هون بـ PERMISSION_KEYS + تسميتها بـ
  PERMISSION_LABELS، (ب) ضيف router.use(requirePermission("المفتاح"))
  بأول route file تبعها (نفس مكان verifyStore بالضبط) - هيك بس، موديل
  Staff بياخدها تلقائيًا لأنه مبني ديناميكيًا من هالقائمة

  ⚠️ ملاحظة مهمة: "المنتجات" و"المخزون وحالة القطع" بالشريط الجانبي
  مربوطين بنفس route file فعليًا (product.routes.js - شوف
  getInventoryOverview بداخله)، فمقدرش نفصل صلاحياتهم - مفتاح "products"
  الواحد بيتحكم بالاثنين سوا. لو احتجنا فصلهم مستقبلاً، الحل تقسيم
  product.routes.js/controller لملفين منفصلين أولاً، مش مجرد إضافة مفتاح
*/

const PERMISSION_KEYS = [
  "dashboard",
  "orders",
  "products",
  "categories",
  "advancedFilters",
  "customers",
  "favorites",
  "abandonedCarts",
  // الثلاث مفاتيح تحت (memberships/contentAds/notifications) لصفحات لسه
  // فارغة مؤقتة بالفرونت (بلا route file إداري حقيقي بعد) - مضافين من
  // الأساس عشان شاشة "الأدوار" تغطي كل صفحات الشريط الجانبي بلا استثناء
  // من أول يوم، وتصير جاهزة تلقائيًا لحظة ما تُبنى صفحاتهم الحقيقية
  "memberships",
  "deals",
  "coupons",
  "marketers",
  "reviews",
  "contentAds",
  "reports",
  "shipping",
  "notifications",
  "settings",
];

// تسميات عربية لكل مفتاح - تُستخدم بشاشة "الأدوار" (قائمة الـ checkboxes
// وشارات الصلاحيات) وبأي رسالة خطأ تحتاج تسمي المورد بوضوح للمستخدم
const PERMISSION_LABELS = {
  dashboard: "الرئيسية",
  orders: "الطلبات",
  products: "المنتجات والمخزون",
  categories: "الأقسام والفئات",
  advancedFilters: "الفلاتر المتقدمة",
  customers: "العملاء",
  favorites: "المفضلة",
  abandonedCarts: "السلات المتروكة",
  memberships: "العضويات والاشتراكات",
  deals: "العروض والتخفيضات",
  coupons: "الكوبونات",
  marketers: "التسويق بالعمولة",
  reviews: "التقييمات والتعليقات",
  contentAds: "المحتوى والإعلانات",
  reports: "التقارير والتحليلات",
  shipping: "الشحن والتوصيل",
  notifications: "الإشعارات",
  settings: "الإعدادات العامة للمتجر",
};

// بنية صلاحيات فاضية افتراضية (كل شي false) - نقطة انطلاق آمنة لأي
// موظف جديد (Least Privilege by default: بلا منح صريح، ما في وصول)
const buildEmptyPermissions = () =>
  PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

// بنية صلاحيات "الكل مفعّل" - اختصار لزر "منح كل الصلاحيات" بالفرونت،
// وللاستخدام كقيمة مرجعية بالباك إند لو احتجناها
const buildFullPermissions = () =>
  PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});

module.exports = {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  buildEmptyPermissions,
  buildFullPermissions,
};

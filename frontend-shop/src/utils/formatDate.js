/*
  formatDate
  - تنسيق تاريخ بأمان لعرضه بالعربي (ar-EG)
  - لو القيمة مفقودة أو تاريخ غير صالح (مثلاً منتجات قديمة اتزرعت
    بقاعدة البيانات من غير createdAt) بترجع "—" بدل ما تطلع "Invalid Date"
*/
export const formatDate = (value, fallback = "—") => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("ar-EG");
};

/*
  formatFullDate
  - تاريخ كامل مقروء (يوم الأسبوع + اليوم + الشهر بالاسم + السنة) بأرقام
    لاتينية - نفس أسلوب باقي أرقام النظام (toLocaleString("en-US")) حتى
    لو الواجهة عربية بالكامل - مستخدمة برأس صفحة "لوحة التحكم"
*/
export const formatFullDate = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/*
  formatRelativeTime
  - "منذ 5 دقائق" / "منذ 3 ساعات" / "أمس" / "منذ 4 أيام" ... وبعد أسبوع
    بترجع تاريخ عادي (formatDate) بدل ما تفضل تحسب بالأيام لما تصير
    مدة طويلة - مستخدمة بجدول "أحدث الطلبات" بلوحة التحكم الرئيسية
*/
export const formatRelativeTime = (value, fallback = "—") => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `منذ ${diffDays} أيام`;

  return formatDate(value, fallback);
};

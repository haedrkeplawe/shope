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

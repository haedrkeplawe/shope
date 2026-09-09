// user
/*
  formatPrice
  - تنسيق السعر بفواصل الآلاف - مستخدمة بأي مكان بيعرض سعر منتج
*/
export const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString("en-US");
};

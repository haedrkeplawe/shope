/*
  تسمية عربية + نوع لوني لحالة العرض (status بيجي محسوب جاهز من الباك إند)
  بنفس نمط productStatus.js - عشان أي مكان بالفرونت يستخدم نفس التسمية
*/
export const getOfferStatusBadge = (status) => {
  const map = {
    active: { label: "نشط", type: "success" },
    scheduled: { label: "مجدول", type: "info" },
    paused: { label: "متوقف", type: "muted" },
    expired: { label: "منتهي", type: "danger" },
  };

  return map[status] || { label: status, type: "muted" };
};

/*
  تسمية عربية لنوع تطبيق العرض - تُستخدم بفورم الإنشاء/التعديل
*/
export const OFFER_TARGET_OPTIONS = [
  { value: "all", label: "جميع المنتجات" },
  { value: "category", label: "فئة محددة" },
  { value: "specific_products", label: "منتجات محددة" },
  { value: "new_customers", label: "العملاء الجدد فقط" },
];

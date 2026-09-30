/*
  تسمية عربية + نوع لوني لحالة الطلب (status بيجي محسوب جاهز من الباك
  إند) - بنفس نمط productStatus.js/offerStatus.js بالضبط، عشان أي مكان
  بالفرونت يستخدم نفس التسمية والألوان
*/
export const getOrderStatusBadge = (status) => {
  const map = {
    pending: { label: "جديد", type: "pending" },
    confirmed: { label: "تم التأكيد", type: "confirmed" },
    processing: { label: "قيد التجهيز", type: "processing" },
    shipped: { label: "تم الشحن", type: "shipped" },
    delivered: { label: "تم التسليم", type: "delivered" },
    returned: { label: "مرتجع", type: "returned" },
    cancelled: { label: "ملغي", type: "cancelled" },
  };

  return map[status] || { label: status, type: "cancelled" };
};

/*
  كل حالات الطلب بترتيب منطقي لدورة حياتها - تُستخدم بقوائم الفلترة
*/
export const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "جديد" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "processing", label: "قيد التجهيز" },
  { value: "shipped", label: "تم الشحن" },
  { value: "delivered", label: "تم التسليم" },
  { value: "returned", label: "مرتجع" },
  { value: "cancelled", label: "ملغي" },
];

/*
  خريطة الانتقالات المسموحة من كل حالة - نفس منطق السيرفر بالضبط
  (utils/orderStatusEngine.js بالباك إند) عشان قائمة "تغيير الحالة"
  بالفرونت تعرض بس الخيارات المنطقية ومايبعتش طلب مرفوض أصلاً من
  الباك إند. "ملغي" و"مرتجع" حالتين نهائيتين (بدون أي انتقال بعدهم)
*/
export const ORDER_STATUS_TRANSITIONS = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const STATUS_LABEL_MAP = ORDER_STATUS_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

export const getOrderStatusLabel = (status) =>
  STATUS_LABEL_MAP[status] || status;

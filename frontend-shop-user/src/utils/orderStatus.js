// user
/*
  utils/orderStatus.js
  - تحويل حالة الطلب لدرجة لون البادج (tone) - مستخدمة بصفحة تفاصيل الطلب
    وقائمة الطلبات سوا، عشان الألوان تضل موحّدة بمكان واحد بدل ما تتكرر
*/
const STATUS_TONE = {
  pending: "neutral",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

export const getStatusTone = (status) => STATUS_TONE[status] || "neutral";

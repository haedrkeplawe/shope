/*
  تسمية عربية + نوع لوني لحالة موافقة التقييم - بنفس نمط
  productStatus.js/offerStatus.js بالضبط
*/
export const getRatingStatusBadge = (status) => {
  const map = {
    pending: { label: "قيد المراجعة", type: "warning" },
    approved: { label: "معتمد", type: "success" },
    rejected: { label: "مرفوض", type: "danger" },
  };

  return map[status || "pending"] || { label: status, type: "warning" };
};

export const RATING_STATUS_OPTIONS = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "approved", label: "معتمدة" },
  { value: "rejected", label: "مرفوضة" },
];

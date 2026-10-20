/*
  تحديد شارة الحالة المعروضة للمنتج
  - "نفذت الكمية" لو الكمية = 0 (أولوية أعلى من حالة النشر نفسها)
  - غير كده بتترجم publishStatus لتسمية عربية + نوع لوني
  - "reserved" و"sold" حالتين إضافيتين مرتبطتين بدورة حياة القطعة بالمخزون
    (بتتغيّر غالبًا من صفحة "المخزون وحالة القطع")
*/
export const getProductStatusBadge = (product) => {
  if (
    product.quantity !== undefined &&
    product.quantity <= 0 &&
    !["sold", "reserved"].includes(product.publishStatus)
  ) {
    return { label: "نفذت الكمية", type: "danger" };
  }

  const map = {
    published: { label: "متاحة", type: "success" },
    draft: { label: "مسودة", type: "muted" },
    under_review: { label: "قيد الفحص", type: "warning" },
    hidden: { label: "مخفي", type: "muted" },
    awaiting_photos: { label: "قيد التصوير", type: "info" },
    reserved: { label: "محجوزة", type: "reserved" },
    sold: { label: "مباعة", type: "sold" },
  };

  return (
    map[product.publishStatus] || {
      label: product.publishStatus,
      type: "muted",
    }
  );
};

/*
  كل حالات القطعة بترتيب منطقي لدورة حياتها - تُستخدم في صفحة المخزون
  (select تغيير الحالة السريع) وفي كروت الإحصائيات
*/
export const PIECE_STATUS_OPTIONS = [
  { value: "awaiting_photos", label: "قيد التصوير" },
  { value: "under_review", label: "قيد الفحص" },
  { value: "draft", label: "مسودة" },
  { value: "published", label: "متاحة" },
  { value: "reserved", label: "محجوزة" },
  { value: "sold", label: "مباعة" },
  { value: "hidden", label: "مخفي" },
];

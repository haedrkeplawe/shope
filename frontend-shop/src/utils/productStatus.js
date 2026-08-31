/*
  تحديد شارة الحالة المعروضة للمنتج
  - "نفذت الكمية" لو الكمية = 0 (أولوية أعلى من حالة النشر نفسها)
  - غير كده بتترجم publishStatus لتسمية عربية + نوع لوني
*/
export const getProductStatusBadge = (product) => {
  if (product.quantity !== undefined && product.quantity <= 0) {
    return { label: "نفذت الكمية", type: "danger" };
  }

  const map = {
    published: { label: "متاحة", type: "success" },
    draft: { label: "مسودة", type: "muted" },
    under_review: { label: "قيد الفحص", type: "warning" },
    hidden: { label: "مخفي", type: "muted" },
    awaiting_photos: { label: "قيد التصوير", type: "info" },
  };

  return (
    map[product.publishStatus] || {
      label: product.publishStatus,
      type: "muted",
    }
  );
};

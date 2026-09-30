/*
  تسمية عربية + نوع لوني لحالة الكوبون (status بيجي محسوب جاهز من الباك إند)
  بنفس نمط offerStatus.js - عشان أي مكان بالفرونت يستخدم نفس التسمية
*/
export const getCouponStatusBadge = (status) => {
  const map = {
    active: { label: "نشط", type: "success" },
    scheduled: { label: "مجدول", type: "info" },
    paused: { label: "متوقف", type: "muted" },
    expired: { label: "منتهي", type: "danger" },
    exhausted: { label: "مستنفد", type: "danger" },
  };

  return map[status] || { label: status, type: "muted" };
};

/*
  تسمية عربية لنوع الكوبون - تُستخدم بفورم الإنشاء/التعديل
*/
export const COUPON_TYPE_OPTIONS = [
  { value: "percentage", label: "نسبة مئوية" },
  { value: "fixed_amount", label: "مبلغ ثابت" },
];

/*
  تسمية عربية لنطاق تطبيق الكوبون - تُستخدم بفورم الإنشاء/التعديل
  🔭 لو أضفنا فئات ديناميكية مستقبلًا (VIP/عملاء جدد/بيطلبوا كتير...)
  بتنضاف هون كخيارات جديدة فقط - بدون أي تغيير على الكوبونات الموجودة
*/
export const COUPON_SCOPE_OPTIONS = [
  { value: "all", label: "جميع الزبائن" },
  { value: "specific_customers", label: "زبائن محددون" },
];

/*
  تنسيق قيمة الخصم للعرض حسب نوع الكوبون (نسبة% أو مبلغ ل.س)
*/
export const formatCouponValue = (coupon) => {
  if (!coupon) return "—";
  if (coupon.type === "percentage") return `${coupon.discountValue}%`;
  return `${Number(coupon.discountValue).toLocaleString("en-US")} ل.س`;
};

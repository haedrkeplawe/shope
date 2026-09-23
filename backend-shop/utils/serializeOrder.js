/*
  utils/serializeOrder.js
  ------------------------------------------------------------------
  تنسيق مستند الطلب - أربع نسخ:
  - serializeOrderSummary: لواجهة الزبون (تاريخ الطلبات) - مختصرة
  - serializeOrderDetail: لواجهة الزبون (صفحة تفاصيل/تأكيد طلب واحد) -
    كاملة بكل البنود + بيانات الكوبون ومنطقة الشحن المستخدمين وقتها
    (Snapshot ثابت)
  - serializeOrderAdminSummary: لجدول "الطلبات" بلوحة تحكم الأدمن -
    تتضمن بيانات الزبون (لازم customerId يكون populated قبل الاستدعاء)
  - serializeOrderAdminDetail: لصفحة تفاصيل الطلب بلوحة تحكم الأدمن -
    كل شي: سجل انتقالات الحالة الكامل، الملاحظة الداخلية، رقم التتبع
*/

const STATUS_LABELS = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
};

const serializeOrderSummary = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  statusLabel: STATUS_LABELS[order.status] || order.status,
  itemsCount: order.items.length,
  grandTotal: order.grandTotal,
  createdAt: order.createdAt,
});

const serializeOrderDetail = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  statusLabel: STATUS_LABELS[order.status] || order.status,
  paymentMethod: order.paymentMethod,
  shipping: order.shipping,
  // Snapshot منطقة الشحن وقت الطلب - شوف utils/shippingEngine.js
  shippingZoneName: order.shippingZoneName || "",
  shippingDurationLabel: order.shippingDurationLabel || "",
  items: order.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    image: item.image,
    size: item.size,
    color: item.color,
    colorHex: item.colorHex,
    quantity: item.quantity,
    price: item.price,
    originalPrice: item.originalPrice,
    discountPercent: item.discountPercent,
    lineTotal: item.lineTotal,
  })),
  subtotal: order.subtotal,
  totalSavings: order.totalSavings,
  shippingTotal: order.shippingTotal,
  couponCode: order.couponCode || null,
  couponDiscount: order.couponDiscount || 0,
  grandTotal: order.grandTotal,
  createdAt: order.createdAt,
});

/*
  ملخص طلب لجدول لوحة تحكم الأدمن - بيفترض إنه order.customerId متعمل
  عليه populate("customerId", "fullName phone") مسبقًا بالكنترولر، وإلا
  بيرجع customer: null بأمان (بدون ما ينهار)
*/
const serializeOrderAdminSummary = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  statusLabel: STATUS_LABELS[order.status] || order.status,
  customer:
    order.customerId && order.customerId.fullName
      ? {
          id: order.customerId._id,
          fullName: order.customerId.fullName,
          phone: order.customerId.phone,
        }
      : null,
  city: order.shipping?.city || "—",
  itemsCount: order.items.length,
  grandTotal: order.grandTotal,
  // اسم المسوّق (Snapshot) لو الطلب جاء عن طريق رمز إحالة - null لو لأ
  marketerName: order.marketerName || null,
  createdAt: order.createdAt,
});

/*
  تفاصيل طلب كاملة لصفحة تفاصيل الطلب بلوحة تحكم الأدمن - بتتضمن كل شي
  ما هو موجود بنسخة الزبون بالإضافة إلى: بيانات الزبون الكاملة (لازم
  customerId معمول عليه populate)، سجل انتقالات الحالة الكامل (مرتّب
  زمنيًا من الأقدم للأحدث - أساس شريط "تتبع الطلب" الحقيقي)، الملاحظة
  الداخلية، ورقم تتبع الشحنة
*/
const serializeOrderAdminDetail = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  statusLabel: STATUS_LABELS[order.status] || order.status,
  paymentMethod: order.paymentMethod,
  shipping: order.shipping,
  // Snapshot منطقة الشحن وقت الطلب - شوف utils/shippingEngine.js
  shippingZoneName: order.shippingZoneName || "",
  shippingDurationLabel: order.shippingDurationLabel || "",
  customer:
    order.customerId && order.customerId.fullName
      ? {
          id: order.customerId._id,
          fullName: order.customerId.fullName,
          phone: order.customerId.phone,
          email: order.customerId.email || "",
        }
      : null,
  items: order.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    image: item.image,
    size: item.size,
    color: item.color,
    colorHex: item.colorHex,
    quantity: item.quantity,
    price: item.price,
    originalPrice: item.originalPrice,
    discountPercent: item.discountPercent,
    lineTotal: item.lineTotal,
  })),
  subtotal: order.subtotal,
  totalSavings: order.totalSavings,
  shippingTotal: order.shippingTotal,
  couponCode: order.couponCode || null,
  couponDiscount: order.couponDiscount || 0,
  // -------------------- المسوّق (Snapshot وقت الطلب) - شوف utils/marketerEngine.js --------------------
  marketerId: order.marketerId || null,
  marketerCode: order.marketerCode || null,
  marketerName: order.marketerName || null,
  commissionPercentage: order.commissionPercentage ?? null,
  commissionAmount: order.commissionAmount || 0,
  grandTotal: order.grandTotal,
  adminNote: order.adminNote || "",
  trackingNumber: order.trackingNumber || "",
  statusHistory: (order.statusHistory || [])
    .slice()
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt))
    .map((h) => ({
      status: h.status,
      statusLabel: STATUS_LABELS[h.status] || h.status,
      changedAt: h.changedAt,
      note: h.note || "",
    })),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

module.exports = {
  STATUS_LABELS,
  serializeOrderSummary,
  serializeOrderDetail,
  serializeOrderAdminSummary,
  serializeOrderAdminDetail,
};

/*
  utils/serializeOrder.js
  ------------------------------------------------------------------
  تنسيق مستند الطلب لواجهة الزبون - نسختين:
  - serializeOrderSummary: للقوائم (تاريخ الطلبات لاحقًا) - مختصرة
  - serializeOrderDetail: لصفحة تفاصيل/تأكيد طلب واحد - كاملة بكل البنود
*/

const STATUS_LABELS = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
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
  grandTotal: order.grandTotal,
  createdAt: order.createdAt,
});

module.exports = { serializeOrderSummary, serializeOrderDetail };

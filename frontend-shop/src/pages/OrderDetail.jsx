import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiPrinter,
  FiPhone,
  FiMail,
  FiMapPin,
  FiTruck,
  FiPackage,
  FiClock,
  FiCheckCircle,
  FiSettings,
  FiXCircle,
  FiRotateCcw,
  FiImage,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatDate } from "../utils/formatDate";
import {
  getOrderStatusBadge,
  ORDER_STATUS_TRANSITIONS,
} from "../utils/orderStatus";

/*
  OrderDetail
  - صفحة تفاصيل الطلب الكاملة بلوحة تحكم الأدمن: بيانات الزبون والتوصيل،
    القطع المطلوبة، ملخص المبالغ، سجل تتبع حقيقي (statusHistory - مش
    شريط وهمي)، تحديث الحالة/رقم التتبع، وملاحظة داخلية للأدمن
*/

const TIMELINE_ICONS = {
  pending: FiClock,
  confirmed: FiCheckCircle,
  processing: FiSettings,
  shipped: FiTruck,
  delivered: FiCheckCircle,
  cancelled: FiXCircle,
  returned: FiRotateCcw,
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [nextStatus, setNextStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل الطلب");
        navigate("/orders");
        return;
      }

      setOrder(result.order);
      setTrackingNumber(result.order.trackingNumber || "");
      setNoteDraft(result.order.adminNote || "");

      const allowedNext = ORDER_STATUS_TRANSITIONS[result.order.status] || [];
      setNextStatus(allowedNext[0] || "");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          note: statusNote,
          trackingNumber,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الطلب");
        return;
      }

      toast.success(result.message || "تم تحديث حالة الطلب");
      setOrder(result.order);
      setStatusNote("");
      const allowedNext = ORDER_STATUS_TRANSITIONS[result.order.status] || [];
      setNextStatus(allowedNext[0] || "");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: noteDraft }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ الملاحظة");
        return;
      }

      toast.success("تم حفظ الملاحظة");
      setOrder((prev) => ({ ...prev, adminNote: result.adminNote }));
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!order) return null;

  const badge = getOrderStatusBadge(order.status);
  const allowedNext = ORDER_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="order-detail-page">
      {/* الهيدر */}
      <div className="order-detail-header">
        <button
          type="button"
          className="order-detail-back"
          onClick={() => navigate("/orders")}
        >
          <FiArrowRight />
          العودة للطلبات
        </button>
        <div className="order-detail-header-main">
          <div>
            <h1 className="order-detail-title">
              طلب {order.orderNumber}
              <span
                className={`order-status-badge order-status-badge--${badge.type}`}
              >
                {badge.label}
              </span>
            </h1>
            <p className="order-detail-subtitle">
              تم إنشاؤه بتاريخ {formatDate(order.createdAt)}
            </p>
          </div>
          <button
            type="button"
            className="order-detail-print-btn"
            onClick={() => window.print()}
          >
            <FiPrinter />
            طباعة الطلب
          </button>
        </div>
      </div>

      <div className="order-detail-grid">
        {/* العمود الرئيسي */}
        <div className="order-detail-main">
          {/* سجل تتبع الطلب */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">تتبع الطلب</h3>
            <div className="order-timeline">
              {order.statusHistory.map((entry, index) => {
                const entryBadge = getOrderStatusBadge(entry.status);
                const Icon = TIMELINE_ICONS[entry.status] || FiClock;
                const isLast = index === order.statusHistory.length - 1;
                return (
                  <div
                    className="order-timeline-item"
                    key={`${entry.status}-${index}`}
                  >
                    <div className="order-timeline-marker-col">
                      <span
                        className={`order-timeline-marker order-timeline-marker--${entryBadge.type}`}
                      >
                        <Icon />
                      </span>
                      {!isLast && <span className="order-timeline-line" />}
                    </div>
                    <div className="order-timeline-content">
                      <span className="order-timeline-status">
                        {entryBadge.label}
                      </span>
                      <span className="order-timeline-date">
                        {formatDate(entry.changedAt)}
                      </span>
                      {entry.note && (
                        <p className="order-timeline-note">{entry.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* المنتجات */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">
              المنتجات ({order.items.length})
            </h3>
            <div className="order-items-list">
              {order.items.map((item, index) => (
                <div className="order-item-row" key={index}>
                  <div className="order-item-image">
                    {item.image ? (
                      <img src={getImageUrl(item.image)} alt={item.name} />
                    ) : (
                      <FiImage />
                    )}
                  </div>
                  <div className="order-item-info">
                    <span className="order-item-name">{item.name}</span>
                    <span className="order-item-meta">
                      {item.brand ? `${item.brand} · ` : ""}
                      {item.size ? `المقاس: ${item.size} · ` : ""}
                      {item.color ? (
                        <span className="order-item-color">
                          {item.colorHex && (
                            <span
                              className="order-item-color-dot"
                              style={{ backgroundColor: item.colorHex }}
                            />
                          )}
                          {item.color}
                        </span>
                      ) : null}
                    </span>
                    <span className="order-item-qty">
                      الكمية: {item.quantity}
                    </span>
                  </div>
                  <div className="order-item-price">
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="order-item-original-price">
                        {item.originalPrice.toLocaleString("en-US")} ل.س
                      </span>
                    )}
                    <span className="order-item-line-total">
                      {item.lineTotal.toLocaleString("en-US")} ل.س
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* العمود الجانبي */}
        <div className="order-detail-side">
          {/* بيانات الزبون */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">معلومات العميل</h3>
            <div className="order-customer-info">
              <span className="order-customer-avatar">
                {order.customer?.fullName?.charAt(0) || "؟"}
              </span>
              <span className="order-customer-name">
                {order.customer?.fullName || "زبون محذوف"}
              </span>
            </div>
            <div className="order-info-line">
              <FiPhone />
              <span dir="ltr">{order.shipping.phone}</span>
            </div>
            {order.shipping.email && (
              <div className="order-info-line">
                <FiMail />
                <span>{order.shipping.email}</span>
              </div>
            )}
            <div className="order-info-line order-info-line--address">
              <FiMapPin />
              <span>
                {order.shipping.address}، {order.shipping.city}
                {order.shipping.region ? `، ${order.shipping.region}` : ""}
              </span>
            </div>
            {order.shippingZoneName && (
              <div className="order-info-line">
                <FiTruck />
                <span>
                  منطقة الشحن: {order.shippingZoneName}
                  {order.shippingDurationLabel
                    ? ` - التوصيل خلال ${order.shippingDurationLabel}`
                    : ""}
                </span>
              </div>
            )}
          </div>

          {/* ملخص الطلب */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">ملخص الطلب</h3>
            <div className="order-summary-row">
              <span>المجموع الفرعي</span>
              <span>{order.subtotal.toLocaleString("en-US")} ل.س</span>
            </div>
            {order.totalSavings > 0 && (
              <div className="order-summary-row order-summary-row--savings">
                <span>الوفورات</span>
                <span>-{order.totalSavings.toLocaleString("en-US")} ل.س</span>
              </div>
            )}
            {order.couponCode && (
              <div className="order-summary-row order-summary-row--savings">
                <span>كوبون ({order.couponCode})</span>
                <span>-{order.couponDiscount.toLocaleString("en-US")} ل.س</span>
              </div>
            )}
            <div className="order-summary-row">
              <span>رسوم الشحن</span>
              <span>
                {order.shippingTotal > 0
                  ? `${order.shippingTotal.toLocaleString("en-US")} ل.س`
                  : "مجاني"}
              </span>
            </div>
            <div className="order-summary-row order-summary-row--total">
              <span>الإجمالي</span>
              <span>{order.grandTotal.toLocaleString("en-US")} ل.س</span>
            </div>
            <div className="order-summary-payment">
              <FiPackage /> الدفع نقدًا عند الاستلام
            </div>
          </div>

          {/* تحديث الحالة */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">تحديث حالة الطلب</h3>
            {allowedNext.length === 0 ? (
              <p className="order-status-locked">
                هذا الطلب بحالة نهائية ({badge.label}) ولا يمكن تغييرها.
              </p>
            ) : (
              <>
                <label className="order-form-label">الحالة التالية</label>
                <select
                  className="inventory-select order-form-select"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  {allowedNext.map((value) => (
                    <option key={value} value={value}>
                      {getOrderStatusBadge(value).label}
                    </option>
                  ))}
                </select>

                <label className="order-form-label">
                  رقم تتبع الشحنة (اختياري)
                </label>
                <input
                  type="text"
                  className="order-form-input"
                  placeholder="مثال: SY-123456789"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  dir="ltr"
                />

                <label className="order-form-label">
                  ملاحظة على هذا التغيير (اختياري)
                </label>
                <textarea
                  className="order-form-textarea"
                  rows={2}
                  placeholder="مثال: تم التواصل مع الزبون لتأكيد العنوان"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />

                <button
                  type="button"
                  className="order-form-submit"
                  disabled={savingStatus}
                  onClick={handleUpdateStatus}
                >
                  {savingStatus ? "جاري الحفظ..." : "تحديث الحالة"}
                </button>
              </>
            )}

            {allowedNext.length === 0 && order.trackingNumber && (
              <p className="order-tracking-readonly">
                رقم التتبع: <span dir="ltr">{order.trackingNumber}</span>
              </p>
            )}
          </div>

          {/* ملاحظة داخلية */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">ملاحظة داخلية</h3>
            <p className="order-form-hint">
              ملاحظة للأدمن فقط - غير ظاهرة للزبون أبدًا
            </p>
            <textarea
              className="order-form-textarea"
              rows={3}
              placeholder="أضف ملاحظة داخلية على هذا الطلب..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <button
              type="button"
              className="order-form-submit order-form-submit--muted"
              disabled={savingNote}
              onClick={handleSaveNote}
            >
              {savingNote ? "جاري الحفظ..." : "حفظ الملاحظة"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiPrinter,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatDate } from "../utils/formatDate";
import {
  getOrderStatusBadge,
  ORDER_STATUS_TRANSITIONS,
} from "../utils/orderStatus";

/*
  OrderDetail (تفاصيل الطلب بلوحة تحكم الأدمن)
  ------------------------------------------------------------------
  صفحة جديدة - Orders.jsx كانت أصلاً بتعمل navigate('/orders/:id') من
  غير ما توجد الصفحة يلي بتستقبلها، وGET /admin/orders/:id كان جاهز
  بالباك إند من غير واجهة تستهلكه. كل الـ CSS (order-detail-*, order-
  timeline-*, order-items-list, order-form-*...) كانت موجودة أصلاً
  بـ orders.css بانتظار هاي الصفحة بالضبط

  - تتبع الطلب: Timeline حقيقي من statusHistory (مش شريط وهمي محسوب من
    الحالة الحالية)
  - تحديث الحالة والملاحظة الداخلية إجراءان منفصلان (نفس فصل الـ
    endpoints بالباك إند)
  - قسم "الدفع" بيظهر بس لطلبات شام كاش (paymentMethod === "shamcash") -
    صورة الإيصال + تأكيد/رفض الدفع + سجل تاريخ حالة الدفع. لحد ما الدفع
    يتأكد، فورم "تحديث الحالة" بيستبدل بملاحظة قفل واضحة (order-status-locked) -
    نفس البوابة المطبّقة بالباك إند (utils/orderStatusEngine.js)
*/

// إعادة استخدام ألوان بادجات حالة الطلب الموجودة أصلاً (pending=كهرماني،
// delivered=أخضر، returned=أحمر) لبادج حالة الدفع بدل ما نخترع ألوان
// جديدة - 3 حالات بس فعليًا بتحتاج بادج (not_applicable ما بتترسم أصلاً)
const PAYMENT_BADGE_CLASS = {
  pending_verification: "pending",
  verified: "delivered",
  rejected: "returned",
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statusDraft, setStatusDraft] = useState("");
  const [trackingDraft, setTrackingDraft] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

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
      setStatusDraft(result.order.status);
      setTrackingDraft(result.order.trackingNumber || "");
      setNoteDraft(result.order.adminNote || "");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const paymentLocked =
    order?.paymentMethod === "shamcash" && order?.paymentStatus !== "verified";

  const handleSaveStatus = async () => {
    setSavingStatus(true);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: statusDraft,
          trackingNumber: trackingDraft,
          note: statusNote,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الطلب");
        return;
      }

      toast.success("تم تحديث حالة الطلب");
      setStatusNote("");
      setOrder(result.order);
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
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSavingNote(false);
    }
  };

  const handleConfirmPayment = async () => {
    setProcessingPayment(true);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}/payment/confirm`, {
        method: "PATCH",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تأكيد الدفع");
        return;
      }

      toast.success("تم تأكيد الدفع");
      setOrder(result.order);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    setProcessingPayment(true);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}/payment/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: rejectReason }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر رفض الدفع");
        return;
      }

      toast.success("تم رفض الدفع، بانتظار الزبون يرفع صورة جديدة");
      setShowRejectBox(false);
      setRejectReason("");
      setOrder(result.order);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setProcessingPayment(false);
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
              طلب #{order.orderNumber}
              <span
                className={`order-status-badge order-status-badge--${badge.type}`}
              >
                {badge.label}
              </span>
            </h1>
            <p className="order-detail-subtitle">
              {order.customer?.fullName || "زبون محذوف"} ·{" "}
              {formatDate(order.createdAt)}
            </p>
          </div>
          <button
            type="button"
            className="order-detail-print-btn"
            onClick={() => window.print()}
          >
            <FiPrinter /> طباعة
          </button>
        </div>
      </div>

      <div className="order-detail-grid">
        {/* العمود الرئيسي */}
        <div className="order-detail-main">
          {/* قسم الدفع - شام كاش فقط */}
          {order.paymentMethod === "shamcash" && (
            <div className="order-detail-card">
              <h3 className="order-detail-card-title">الدفع عبر شام كاش</h3>

              <div className="order-info-line">
                <span
                  className={`order-status-badge order-status-badge--${
                    PAYMENT_BADGE_CLASS[order.paymentStatus] || "pending"
                  }`}
                >
                  {order.paymentStatusLabel}
                </span>
              </div>

              {order.paymentReceiptImage && (
                <img
                  src={getImageUrl(order.paymentReceiptImage)}
                  alt="صورة إيصال الدفع"
                  className="order-payment-receipt-image"
                />
              )}

              {order.paymentStatus === "pending_verification" && (
                <div className="order-payment-actions">
                  <button
                    type="button"
                    className="order-form-submit"
                    onClick={handleConfirmPayment}
                    disabled={processingPayment}
                  >
                    <FiCheckCircle /> تأكيد الدفع
                  </button>
                  <button
                    type="button"
                    className="order-form-submit order-form-submit--muted"
                    onClick={() => setShowRejectBox((v) => !v)}
                    disabled={processingPayment}
                  >
                    <FiXCircle /> رفض وطلب تصحيح
                  </button>
                </div>
              )}

              {showRejectBox &&
                order.paymentStatus === "pending_verification" && (
                  <div className="order-payment-reject-box">
                    <label className="order-form-label">
                      سبب الرفض (اختياري - بيوصل للزبون)
                    </label>
                    <textarea
                      className="order-form-textarea"
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="مثلاً: المبلغ بالإيصال لا يطابق قيمة الطلب"
                    />
                    <button
                      type="button"
                      className="order-form-submit"
                      onClick={handleRejectPayment}
                      disabled={processingPayment}
                    >
                      {processingPayment ? "جاري الإرسال..." : "تأكيد الرفض"}
                    </button>
                  </div>
                )}

              {order.paymentStatus === "rejected" &&
                order.paymentRejectionReason && (
                  <p className="order-payment-rejected-reason">
                    <FiAlertTriangle /> {order.paymentRejectionReason}
                  </p>
                )}

              {order.paymentStatusHistory?.length > 0 && (
                <div className="order-timeline order-payment-timeline">
                  {order.paymentStatusHistory.map((h, index) => (
                    <div className="order-timeline-item" key={index}>
                      <div className="order-timeline-marker-col">
                        <span
                          className={`order-timeline-marker order-timeline-marker--${
                            PAYMENT_BADGE_CLASS[h.status] || "pending"
                          }`}
                        >
                          {h.status === "verified" ? (
                            <FiCheckCircle />
                          ) : h.status === "rejected" ? (
                            <FiXCircle />
                          ) : (
                            <FiAlertTriangle />
                          )}
                        </span>
                        {index < order.paymentStatusHistory.length - 1 && (
                          <span className="order-timeline-line" />
                        )}
                      </div>
                      <div className="order-timeline-content">
                        <span className="order-timeline-status">
                          {h.statusLabel}
                        </span>
                        <span className="order-timeline-date">
                          {formatDate(h.changedAt)}
                        </span>
                        {h.note && (
                          <p className="order-timeline-note">{h.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* تتبع الطلب */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">تتبع الطلب</h3>
            <div className="order-timeline">
              {order.statusHistory.map((h, index) => (
                <div className="order-timeline-item" key={index}>
                  <div className="order-timeline-marker-col">
                    <span
                      className={`order-timeline-marker order-timeline-marker--${h.status}`}
                    >
                      <FiTruck />
                    </span>
                    {index < order.statusHistory.length - 1 && (
                      <span className="order-timeline-line" />
                    )}
                  </div>
                  <div className="order-timeline-content">
                    <span className="order-timeline-status">
                      {h.statusLabel}
                    </span>
                    <span className="order-timeline-date">
                      {formatDate(h.changedAt)}
                    </span>
                    {h.note && <p className="order-timeline-note">{h.note}</p>}
                  </div>
                </div>
              ))}
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
                    {item.image && (
                      <img src={getImageUrl(item.image)} alt={item.name} />
                    )}
                  </div>
                  <div className="order-item-info">
                    <span className="order-item-name">{item.name}</span>
                    <div className="order-item-meta">
                      {item.color && (
                        <span className="order-item-color">
                          {item.colorHex && (
                            <span
                              className="order-item-color-dot"
                              style={{ backgroundColor: item.colorHex }}
                            />
                          )}
                          {item.color}
                        </span>
                      )}
                      {item.size && <span>مقاس {item.size}</span>}
                    </div>
                    <span className="order-item-qty">
                      الكمية: {item.quantity}
                    </span>
                  </div>
                  <div className="order-item-price">
                    {item.originalPrice && (
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
          {/* بيانات العميل والتوصيل */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">بيانات العميل</h3>
            <div className="order-customer-info">
              <span className="order-customer-avatar">
                {order.customer?.fullName?.charAt(0) || "؟"}
              </span>
              <span className="order-customer-name">
                {order.customer?.fullName || "زبون محذوف"}
              </span>
            </div>
            <div className="order-info-line">
              <FiPhone /> {order.shipping.phone}
            </div>
            {order.customer?.email && (
              <div className="order-info-line">
                <FiMail /> {order.customer.email}
              </div>
            )}
            <div className="order-info-line order-info-line--address">
              <FiMapPin />
              {order.shipping.address}، {order.shipping.city}
              {order.shippingZoneName ? ` (${order.shippingZoneName})` : ""}
            </div>
            {order.shippingDurationLabel && (
              <div className="order-info-line">
                <FiTruck /> التوصيل خلال {order.shippingDurationLabel}
              </div>
            )}
            {order.marketerName && (
              <div className="order-info-line">
                <FiUser /> عبر المسوّق: {order.marketerName} (
                {order.marketerCode})
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
                <span>وفورات</span>
                <span>{order.totalSavings.toLocaleString("en-US")} ل.س</span>
              </div>
            )}
            {order.couponDiscount > 0 && (
              <div className="order-summary-row order-summary-row--savings">
                <span>خصم الكوبون ({order.couponCode})</span>
                <span>
                  - {order.couponDiscount.toLocaleString("en-US")} ل.س
                </span>
              </div>
            )}
            <div className="order-summary-row">
              <span>الشحن</span>
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
            <p className="order-summary-payment">
              <FiUser />
              {order.paymentMethod === "shamcash"
                ? "الدفع عبر شام كاش"
                : "الدفع نقدًا عند الاستلام"}
            </p>
          </div>

          {/* تحديث الحالة */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">تحديث حالة الطلب</h3>

            {paymentLocked ? (
              <p className="order-status-locked">
                🔒 لازم تأكيد الدفع أولاً (بالأعلى) قبل ما تقدر تغيّر حالة هذا
                الطلب
              </p>
            ) : allowedNext.length === 0 ? (
              <p className="order-status-locked">
                هذا الطلب بحالة نهائية، ما في انتقال إضافي متاح
              </p>
            ) : (
              <>
                <label className="order-form-label">الحالة الجديدة</label>
                <select
                  className="order-form-select order-form-input"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                >
                  <option value={order.status}>{badge.label}</option>
                  {allowedNext.map((value) => (
                    <option key={value} value={value}>
                      {getOrderStatusBadge(value).label}
                    </option>
                  ))}
                </select>

                <label className="order-form-label">رقم تتبع الشحنة</label>
                <input
                  type="text"
                  className="order-form-input"
                  value={trackingDraft}
                  onChange={(e) => setTrackingDraft(e.target.value)}
                  placeholder="اختياري"
                  dir="ltr"
                />

                <label className="order-form-label">ملاحظة على الانتقال</label>
                <textarea
                  className="order-form-textarea"
                  rows={2}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="اختياري"
                />

                <button
                  type="button"
                  className="order-form-submit"
                  onClick={handleSaveStatus}
                  disabled={savingStatus || statusDraft === order.status}
                >
                  {savingStatus ? "جاري الحفظ..." : "حفظ الحالة"}
                </button>
              </>
            )}

            {order.trackingNumber && (
              <p className="order-tracking-readonly">
                رقم التتبع الحالي: {order.trackingNumber}
              </p>
            )}
          </div>

          {/* الملاحظة الداخلية */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">ملاحظة داخلية</h3>
            <p className="order-form-hint">غير ظاهرة للزبون أبدًا</p>
            <textarea
              className="order-form-textarea"
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="مثلاً: الزبون طلب تأجيل التوصيل ليوم الخميس"
            />
            <button
              type="button"
              className="order-form-submit"
              onClick={handleSaveNote}
              disabled={savingNote}
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

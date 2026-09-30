// user
import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiShoppingBag,
  FiChevronRight,
  FiUpload,
  FiAlertTriangle,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { getStatusTone } from "../utils/orderStatus";

// تدرّج لون بادج حالة التحقق من دفع شام كاش - نفس فلسفة getStatusTone
// بس لحقل paymentStatus (مش order.status)، شوف utils/orderStatus.js
const PAYMENT_STATUS_TONE = {
  pending_verification: "info",
  verified: "success",
  rejected: "danger",
};

/*
  OrderDetail (تفاصيل/تأكيد الطلب)
  - نفس الصفحة تُستخدم لغرضين: شاشة تأكيد الطلب فورًا بعد الدفع (لو
    الزبون وصلها من Checkout عن طريق navigate مع state.justPlaced)، وصفحة
    تتبع/تفاصيل عادية لو رجع لها لاحقًا (رابط مباشر، أو من تاريخ الطلبات
    مستقبلًا) - فرق العرض بس شريط الترحيب الأخضر بالأعلى، المحتوى تحته
    (الحالة، البنود، معلومات التوصيل، المجاميع) نفسه بالحالتين، فالزبون
    فعليًا شايف "تتبع الطلب" فورًا بدون ما يحتاج ينتقل لصفحة تانية
  - couponCode/couponDiscount هون Snapshot ثابت من لحظة الشراء (راجع
    models/order.js) - بيضلوا يعرضوا بالضبط شو استفاد منه الزبون وقتها
    حتى لو الكوبون نفسه اتحذف أو اتغيّرت شروطه بعدين من لوحة تحكم الأدمن

  ⚠️ تحديث نظام الشحن: order.shippingTotal/order.grandTotal ضلوا بنفس
  الاسم والشكل بالضبط - بس مصدر الرقم تغيّر (بقى محسوب على مستوى السلة
  كاملة حسب منطقة شحن الزبون وقت الطلب، مش لكل قطعة لحالها). order.
  shippingDurationLabel حقل جديد (Snapshot ثابت لمدة التوصيل وقتها) بيتعرض
  هون كمعلومة إضافية بس لو موجود - الطلبات القديمة قبل هالتحديث ما
  بيكون عندها هالحقل، فبيختفي تلقائيًا بدون ما يكسر شي
*/
const OrderDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = location.state?.justPlaced;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // إعادة رفع صورة الإيصال بعد رفض الأدمن - شوف order-card "الدفع" تحت
  const [newReceiptFile, setNewReceiptFile] = useState(null);
  const [newReceiptPreview, setNewReceiptPreview] = useState(null);
  const [reuploading, setReuploading] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_URL}/orders/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (error) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleNewReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewReceiptFile(file);
    setNewReceiptPreview(URL.createObjectURL(file));
  };

  const handleReuploadReceipt = async () => {
    if (!newReceiptFile) {
      toast.error("الرجاء اختيار صورة الإيصال الجديدة أولاً");
      return;
    }

    setReuploading(true);
    try {
      const formData = new FormData();
      formData.append("paymentReceiptImage", newReceiptFile);

      const res = await fetch(`${API_URL}/orders/${id}/payment-receipt`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذّر رفع الصورة");
        return;
      }

      toast.success(data.message || "تم رفع الصورة بنجاح");
      setNewReceiptFile(null);
      setNewReceiptPreview(null);
      setOrder(data.order);
    } catch (error) {
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setReuploading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <span className="page-spinner" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="order-not-found">
        <h2>هاي الطلب مش موجود</h2>
        <Link to="/" className="order-not-found-link">
          الرجوع للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="order-page">
      {justPlaced && (
        <div className="order-success-banner">
          <span className="order-success-icon">
            <FiCheckCircle />
          </span>
          <h1>تم تأكيد طلبك!</h1>
          <p>
            رقم الطلب: <strong>#{order.orderNumber}</strong>
          </p>
          <p className="order-success-note">
            شكرًا لثقتك بنا! رح نجهّز طلبك حالًا ونتواصل معك عند الشحن
          </p>
        </div>
      )}

      {!justPlaced && (
        <>
          <Link to="/orders" className="order-back-link">
            <FiChevronRight /> طلباتي
          </Link>
          <div className="order-header">
            <h1>تفاصيل الطلب</h1>
            <span className="order-number">#{order.orderNumber}</span>
          </div>
        </>
      )}

      <div className="order-card">
        <div className="order-card-row">
          <span>حالة الطلب</span>
          <span
            className={`order-status order-status--${getStatusTone(
              order.status,
            )}`}
          >
            {order.statusLabel}
          </span>
        </div>
        <div className="order-card-row">
          <span>تاريخ الطلب</span>
          <span>
            {new Date(order.createdAt).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="order-card-row">
          <span>طريقة الدفع</span>
          <span>
            {order.paymentMethod === "shamcash"
              ? "شام كاش"
              : "الدفع نقدًا عند الاستلام"}
          </span>
        </div>
        {order.shippingDurationLabel && (
          <div className="order-card-row">
            <span>مدة التوصيل المتوقعة</span>
            <span>{order.shippingDurationLabel}</span>
          </div>
        )}
      </div>

      {order.paymentMethod === "shamcash" && (
        <div className="order-card">
          <div className="order-card-row">
            <span>حالة الدفع</span>
            <span
              className={`order-status order-status--${
                PAYMENT_STATUS_TONE[order.paymentStatus] || "neutral"
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

          {order.paymentStatus === "rejected" && (
            <div className="order-payment-rejected">
              <p className="order-payment-rejected-reason">
                <FiAlertTriangle />
                {order.paymentRejectionReason ||
                  "في مشكلة بصورة الإيصال، الرجاء رفع صورة جديدة واضحة"}
              </p>

              <label className="checkout-receipt-upload">
                {newReceiptPreview ? (
                  <>
                    <img src={newReceiptPreview} alt="معاينة الإيصال الجديد" />
                    <div className="checkout-receipt-upload-overlay">
                      <FiUpload />
                      تغيير الصورة
                    </div>
                  </>
                ) : (
                  <div className="checkout-receipt-upload-empty">
                    <FiUpload />
                    <span>اضغط لرفع صورة الإيصال الجديدة</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewReceiptChange}
                  hidden
                />
              </label>

              <button
                type="button"
                className="order-continue-btn"
                onClick={handleReuploadReceipt}
                disabled={reuploading || !newReceiptFile}
              >
                {reuploading ? "جاري الرفع..." : "رفع الصورة الجديدة"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="order-card">
        <h2 className="order-card-title">معلومات التوصيل</h2>
        <p className="order-shipping-text">
          {order.shipping.fullName} - {order.shipping.phone}
          <br />
          {order.shipping.address}، {order.shipping.city}
        </p>
      </div>

      <div className="order-card">
        <h2 className="order-card-title">المنتجات ({order.items.length})</h2>
        <div className="order-items">
          {order.items.map((item, i) => (
            <div key={i} className="order-item">
              <div className="order-item-image">
                {item.image && (
                  <img src={getImageUrl(item.image)} alt={item.name} />
                )}
              </div>
              <div className="order-item-info">
                {item.brand && <span>{item.brand}</span>}
                <h4>{item.name}</h4>
                {(item.color || item.size) && (
                  <div className="order-item-variant">
                    {item.color && (
                      <span className="order-item-variant-tag">
                        {item.colorHex && (
                          <span
                            className="order-item-color-dot"
                            style={{ backgroundColor: item.colorHex }}
                          />
                        )}
                        {item.color}
                      </span>
                    )}
                    {item.size && (
                      <span className="order-item-variant-tag">
                        المقاس: {item.size}
                      </span>
                    )}
                  </div>
                )}
                <p>الكمية: {item.quantity}</p>
              </div>
              <span className="order-item-price">
                {formatPrice(item.lineTotal)} ل.س
              </span>
            </div>
          ))}
        </div>
      </div>

      {order.couponCode && (
        <div className="order-card">
          <h2 className="order-card-title">الكوبون المستخدم</h2>
          <p className="order-shipping-text">
            كود <strong>{order.couponCode}</strong> - خصم{" "}
            {formatPrice(order.couponDiscount)} ل.س
          </p>
        </div>
      )}

      <div className="order-summary">
        <div className="order-summary-row">
          <span>المجموع الفرعي</span>
          <span>{formatPrice(order.subtotal)} ل.س</span>
        </div>
        {order.totalSavings > 0 && (
          <div className="order-summary-row order-summary-row--savings">
            <span>وفّرت</span>
            <span>{formatPrice(order.totalSavings)} ل.س</span>
          </div>
        )}
        {order.couponDiscount > 0 && (
          <div className="order-summary-row order-summary-row--coupon">
            <span>خصم الكوبون ({order.couponCode})</span>
            <span>- {formatPrice(order.couponDiscount)} ل.س</span>
          </div>
        )}
        <div className="order-summary-row">
          <span>الشحن</span>
          <span>
            {order.shippingTotal > 0
              ? `${formatPrice(order.shippingTotal)} ل.س`
              : "مجاني"}
          </span>
        </div>
        <div className="order-summary-row order-summary-row--total">
          <span>الإجمالي</span>
          <span>{formatPrice(order.grandTotal)} ل.س</span>
        </div>
      </div>

      <div className="order-actions">
        <Link to="/" className="order-continue-btn">
          <FiShoppingBag /> متابعة التسوق
        </Link>
        {justPlaced && (
          <Link to="/orders" className="order-view-all-link">
            عرض كل طلباتي
          </Link>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;

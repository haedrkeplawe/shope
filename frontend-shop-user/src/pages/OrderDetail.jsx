// user
import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { FiCheckCircle, FiShoppingBag, FiChevronRight } from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { getStatusTone } from "../utils/orderStatus";

/*
  OrderDetail (تفاصيل/تأكيد الطلب)
  - نفس الصفحة تُستخدم لغرضين: شاشة تأكيد الطلب فورًا بعد الدفع (لو
    الزبون وصلها من Checkout عن طريق navigate مع state.justPlaced)، وصفحة
    تتبع/تفاصيل عادية لو رجع لها لاحقًا (رابط مباشر، أو من تاريخ الطلبات
    مستقبلًا) - فرق العرض بس شريط الترحيب الأخضر بالأعلى، المحتوى تحته
    (الحالة، البنود، معلومات التوصيل، المجاميع) نفسه بالحالتين، فالزبون
    فعليًا شايف "تتبع الطلب" فورًا بدون ما يحتاج ينتقل لصفحة تانية
*/
const OrderDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = location.state?.justPlaced;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
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

    fetchOrder();
  }, [id]);

  if (loading) return null;

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
          <span>الدفع نقدًا عند الاستلام</span>
        </div>
      </div>

      <div className="order-card">
        <h2 className="order-card-title">معلومات التوصيل</h2>
        <p className="order-shipping-text">
          {order.shipping.fullName} - {order.shipping.phone}
          <br />
          {order.shipping.address}، {order.shipping.city}
          {order.shipping.region ? `، ${order.shipping.region}` : ""}
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

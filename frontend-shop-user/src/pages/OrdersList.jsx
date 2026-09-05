// user
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiPackage, FiChevronLeft } from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { getStatusTone } from "../utils/orderStatus";

/*
  OrdersList (طلباتي)
  - سجل كامل لكل طلبات الزبون، الأحدث أولًا (نفس ترتيب /api/orders من
    الباك اند) - كل بطاقة قابلة للضغط وبتودي لتفاصيل الطلب الكاملة
    (نفس صفحة OrderDetail المستخدمة فورًا بعد الدفع، بس من غير شريط
    الترحيب الأخضر لأنها مش "لسه صار" هون)
*/
const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setOrders(data.orders || []);
      } catch (error) {
        // تجاهل - بترسم حالة فاضية
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return null;

  return (
    <div className="orders-list-page">
      <h1 className="orders-list-title">طلباتي</h1>

      {orders.length === 0 ? (
        <div className="orders-list-empty">
          <FiPackage className="orders-list-empty-icon" />
          <h2>ما عندك طلبات لسه</h2>
          <p>أي طلب بتسويه رح يظهر هون تلقائيًا</p>
          <Link to="/" className="orders-list-empty-link">
            الرجوع للرئيسية
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="orders-list-card"
            >
              <div className="orders-list-card-top">
                <span className="orders-list-number">#{order.orderNumber}</span>
                <span
                  className={`order-status order-status--${getStatusTone(
                    order.status,
                  )}`}
                >
                  {order.statusLabel}
                </span>
              </div>

              <div className="orders-list-card-bottom">
                <div>
                  <p className="orders-list-date">
                    {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="orders-list-items-count">
                    {order.itemsCount}{" "}
                    {order.itemsCount === 1 ? "منتج" : "منتجات"}
                  </p>
                </div>
                <div className="orders-list-card-right">
                  <span className="orders-list-total">
                    {formatPrice(order.grandTotal)} ل.س
                  </span>
                  <FiChevronLeft />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersList;

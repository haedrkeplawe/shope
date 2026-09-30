import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiX, FiPhone, FiMail, FiAward, FiHeart, FiStar } from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import { getOrderStatusBadge } from "../utils/orderStatus";

/*
  CustomerDetailModal
  - نافذة منبثقة تعرض ملف زبون كامل: بياناته، إحصائياته (طلبات/إنفاق/
    مفضلة/تقييمات)، وآخر 10 طلبات له - قابلة للنقر لفتح تفاصيل الطلب
    مباشرة (شوف OrderDetail.jsx)
  - بتعيد استخدام نمط "product-picker-overlay" الموجود أصلاً بـ deals.css
    للخلفية المعتمة، بمحتوى مخصص كليًا داخلها
*/
const CustomerDetailModal = ({ customerId, onClose }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setData(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/customers/${customerId}`, {
          credentials: "include",
        });
        const result = await res.json();

        if (!res.ok) {
          toast.error(result.message || "تعذر تحميل ملف العميل");
          onClose();
          return;
        }

        setData(result);
      } catch (error) {
        toast.error("تعذر الاتصال بالسيرفر");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (!customerId) return null;

  const { customer, recentOrders } = data || {};

  return (
    <div className="product-picker-overlay" onClick={onClose}>
      <div
        className="customer-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="product-picker-header">
          <h3>ملف العميل</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {loading || !customer ? (
          <div className="categories-loading">جاري التحميل...</div>
        ) : (
          <div className="customer-detail-body">
            <div className="customer-detail-profile">
              <span className="customer-detail-avatar">
                {customer.fullName.charAt(0)}
              </span>
              <div>
                <span className="customer-detail-name">
                  {customer.fullName}
                  {customer.isVip && (
                    <span className="customers-vip-badge" title="عميل VIP">
                      <FiAward />
                    </span>
                  )}
                </span>
                <span
                  className={
                    customer.status === "active"
                      ? "customers-status-label--active"
                      : "customers-status-label--suspended"
                  }
                >
                  {customer.status === "active" ? "حساب نشط" : "حساب معلّق"}
                </span>
              </div>
            </div>

            <div className="order-info-line">
              <FiPhone />
              <span dir="ltr">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="order-info-line">
                <FiMail />
                <span>{customer.email}</span>
              </div>
            )}

            <div className="customer-detail-stats">
              <div className="customer-detail-stat">
                <span className="customer-detail-stat-value">
                  {customer.ordersCount}
                </span>
                <span className="customer-detail-stat-label">طلب</span>
              </div>
              <div className="customer-detail-stat">
                <span className="customer-detail-stat-value">
                  {customer.totalSpent.toLocaleString("en-US")}
                </span>
                <span className="customer-detail-stat-label">ل.س إنفاق</span>
              </div>
              <div className="customer-detail-stat">
                <span className="customer-detail-stat-value">
                  <FiHeart /> {customer.favoritesCount}
                </span>
                <span className="customer-detail-stat-label">مفضلة</span>
              </div>
              <div className="customer-detail-stat">
                <span className="customer-detail-stat-value">
                  <FiStar /> {customer.ratingsCount}
                </span>
                <span className="customer-detail-stat-label">تقييم</span>
              </div>
            </div>

            <p className="customer-detail-joined">
              عضو منذ {formatDate(customer.createdAt)}
            </p>

            <h4 className="customer-detail-orders-title">آخر الطلبات</h4>
            <div className="customer-detail-orders-list">
              {recentOrders.length === 0 && (
                <p className="product-picker-hint">لا توجد طلبات بعد</p>
              )}
              {recentOrders.map((order) => {
                const badge = getOrderStatusBadge(order.status);
                return (
                  <button
                    type="button"
                    key={order.id}
                    className="customer-detail-order-row"
                    onClick={() => {
                      onClose();
                      navigate(`/orders/${order.id}`);
                    }}
                  >
                    <span className="customer-detail-order-number">
                      {order.orderNumber}
                    </span>
                    <span className="customer-detail-order-items">
                      {order.itemsCount} قطعة
                    </span>
                    <span
                      className={`order-status-badge order-status-badge--${badge.type}`}
                    >
                      {badge.label}
                    </span>
                    <span className="customer-detail-order-amount">
                      {order.grandTotal.toLocaleString("en-US")} ل.س
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailModal;

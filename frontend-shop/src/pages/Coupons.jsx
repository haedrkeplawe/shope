import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPause,
  FiPlay,
  FiCopy,
  FiShoppingCart,
  FiCalendar,
  FiCheckCircle,
  FiGift,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import {
  getCouponStatusBadge,
  COUPON_TYPE_OPTIONS,
  formatCouponValue,
} from "../utils/couponStatus";
import StatCard from "../components/StatCard";
import ActionsDropdown from "../components/ActionsDropdown";

/*
  Coupons
  - صفحة "الكوبونات": خصومات مستقلة كليًا عن نظام العروض (Deals) - بتتطبق
    على مجموع الطلب (subtotal) وقت السلة/الدفع، فوق أي خصم/عرض على
    مستوى المنتج نفسه أصلاً (تراكم طبيعي، مش تضارب)
*/
const typeLabel = (type) =>
  COUPON_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

const Coupons = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/coupons`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات الكوبونات");
        return;
      }

      setData(result);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleToggleActive = async (coupon) => {
    try {
      const res = await fetch(`${API_URL}/coupons/${coupon.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الكوبون");
        return;
      }

      toast.success(result.message);
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleCopyCode = async (coupon) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success("تم نسخ الكود");
    } catch (error) {
      toast.error("تعذر نسخ الكود");
    }
  };

  const handleDelete = async (coupon) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الكوبون "${coupon.code}"؟`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/coupons/${coupon.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف الكوبون");
        return;
      }

      toast.success(result.message || "تم حذف الكوبون");
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!data) return null;

  const { stats, coupons } = data;

  return (
    <div className="coupons-page">
      {/* الهيدر */}
      <div className="coupons-header">
        <div>
          <h1 className="coupons-title">الكوبونات</h1>
          <p className="coupons-subtitle">إنشاء كوبونات الخصم وإدارتها</p>
        </div>
        <Link to="/coupons/new" className="coupons-add-btn">
          <FiPlus />
          إنشاء كوبون جديد
        </Link>
      </div>

      {/* الإحصائيات */}
      <div className="coupons-stats-grid">
        <StatCard
          icon={FiShoppingCart}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={stats.totalRedemptions}
          label="الاستخدامات"
        />
        <StatCard
          icon={FiCalendar}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.scheduledCoupons}
          label="كوبونات مجدولة"
        />
        <StatCard
          icon={FiCheckCircle}
          iconBg="#e0f7f4"
          iconColor="#14b8a6"
          value={stats.activeCoupons}
          label="كوبونات نشطة"
        />
        <StatCard
          icon={FiGift}
          iconBg="#fce7f3"
          iconColor="#ec4899"
          value={stats.totalCoupons}
          label="إجمالي الكوبونات"
        />
      </div>

      {/* جدول الكوبونات */}
      <div className="coupons-table-wrapper">
        <table className="coupons-table">
          <thead>
            <tr>
              <th>رمز الكوبون</th>
              <th>الخصم</th>
              <th>النوع</th>
              <th>الحد الأدنى</th>
              <th>الحد الأقصى</th>
              <th>الاستخدامات</th>
              <th>تاريخ الانتهاء</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const badge = getCouponStatusBadge(coupon.status);
              return (
                <tr key={coupon.id}>
                  <td>
                    <span className="coupons-table-code">{coupon.code}</span>
                  </td>
                  <td className="coupons-table-discount">
                    {formatCouponValue(coupon)}
                  </td>
                  <td>{typeLabel(coupon.type)}</td>
                  <td>
                    {coupon.minOrderAmount
                      ? `${coupon.minOrderAmount.toLocaleString("en-US")} ل.س`
                      : "—"}
                  </td>
                  <td>{coupon.maxUsage ?? "غير محدود"}</td>
                  <td>
                    {coupon.usageCount}
                    {coupon.maxUsage ? ` / ${coupon.maxUsage}` : ""}
                  </td>
                  <td>{formatDate(coupon.endDate)}</td>
                  <td>
                    <span
                      className={`offer-status-badge offer-status-badge--${badge.type}`}
                    >
                      <span className="offer-status-dot" />
                      {badge.label}
                    </span>
                  </td>
                  <td>
                    <ActionsDropdown
                      actions={[
                        {
                          label: "تعديل الكوبون",
                          icon: <FiEdit2 />,
                          onClick: () => navigate(`/coupons/${coupon.id}/edit`),
                        },
                        {
                          label: "نسخ الكود",
                          icon: <FiCopy />,
                          onClick: () => handleCopyCode(coupon),
                        },
                        {
                          label: coupon.isActive
                            ? "إيقاف الكوبون"
                            : "تفعيل الكوبون",
                          icon: coupon.isActive ? <FiPause /> : <FiPlay />,
                          onClick: () => handleToggleActive(coupon),
                        },
                        {
                          label: "حذف الكوبون",
                          icon: <FiTrash2 />,
                          onClick: () => handleDelete(coupon),
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}

            {coupons.length === 0 && (
              <tr>
                <td colSpan={9} className="coupons-table-empty">
                  لا توجد كوبونات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Coupons;

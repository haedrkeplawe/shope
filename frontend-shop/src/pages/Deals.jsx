import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPause,
  FiPlay,
  FiShoppingCart,
  FiCalendar,
  FiCheckCircle,
  FiTag,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import { getOfferStatusBadge } from "../utils/offerStatus";
import StatCard from "../components/StatCard";
import ActionsDropdown from "../components/ActionsDropdown";

/*
  Deals
  - صفحة "العروض والتخفيضات": خصومات جماعية (Campaign) منفصلة عن خصم المنتج
    اليدوي، بتطبّق على نطاق أوسع (كل المنتجات/فئة/منتجات محددة)
*/
const Deals = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/offers`, { credentials: "include" });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات العروض");
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

  const handleToggleActive = async (offer) => {
    try {
      const res = await fetch(`${API_URL}/offers/${offer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة العرض");
        return;
      }

      toast.success(result.message);
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleDelete = async (offer) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف "${offer.title}"؟`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/offers/${offer.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف العرض");
        return;
      }

      toast.success(result.message || "تم حذف العرض");
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!data) return null;

  const { stats, offers } = data;

  return (
    <div className="deals-page">
      {/* الهيدر */}
      <div className="deals-header">
        <div>
          <h1 className="deals-title">العروض والتخفيضات</h1>
          <p className="deals-subtitle">إنشاء وإدارة العروض والخصومات</p>
        </div>
        <Link to="/deals/new" className="deals-add-btn">
          <FiPlus />
          إنشاء عرض جديد
        </Link>
      </div>

      {/* الإحصائيات */}
      <div className="deals-stats-grid">
        <StatCard
          icon={FiShoppingCart}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={stats.totalUsage}
          label="الاستخدامات"
        />
        <StatCard
          icon={FiCalendar}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.scheduledOffers}
          label="عروض مجدولة"
        />
        <StatCard
          icon={FiCheckCircle}
          iconBg="#e0f7f4"
          iconColor="#14b8a6"
          value={stats.activeOffers}
          label="عروض نشطة"
        />
        <StatCard
          icon={FiTag}
          iconBg="#fce7f3"
          iconColor="#ec4899"
          value={stats.totalOffers}
          label="إجمالي العروض"
        />
      </div>

      {/* جدول العروض */}
      <div className="deals-table-wrapper">
        <table className="deals-table">
          <thead>
            <tr>
              <th>اسم العرض</th>
              <th>الخصم</th>
              <th>التطبيق على</th>
              <th>تاريخ البداية</th>
              <th>تاريخ الانتهاء</th>
              <th>الاستخدامات</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const badge = getOfferStatusBadge(offer.status);
              return (
                <tr key={offer.id}>
                  <td className="deals-table-name">{offer.title}</td>
                  <td className="deals-table-discount">
                    {offer.discountPercent}%
                  </td>
                  <td>{offer.targetLabel}</td>
                  <td>{formatDate(offer.startDate)}</td>
                  <td>{formatDate(offer.endDate)}</td>
                  <td>{offer.usageCount}</td>
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
                          label: "تعديل العرض",
                          icon: <FiEdit2 />,
                          onClick: () => navigate(`/deals/${offer.id}/edit`),
                        },
                        {
                          label: offer.isActive ? "إيقاف العرض" : "تفعيل العرض",
                          icon: offer.isActive ? <FiPause /> : <FiPlay />,
                          onClick: () => handleToggleActive(offer),
                        },
                        {
                          label: "حذف العرض",
                          icon: <FiTrash2 />,
                          onClick: () => handleDelete(offer),
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}

            {offers.length === 0 && (
              <tr>
                <td colSpan={8} className="deals-table-empty">
                  لا توجد عروض بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Deals;

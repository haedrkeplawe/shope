import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiCheckCircle,
  FiGrid,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import StatCard from "../components/StatCard";
import ToggleSwitch from "../components/ToggleSwitch";
import ActionsDropdown from "../components/ActionsDropdown";
import ShippingZoneModal from "../components/ShippingZoneModal";

/*
  ShippingZones (الشحن والتوصيل)
  ------------------------------------------------------------------
  ⚠️ صفحة جوهرية بالنظام: سعر التوصيل ما عاد يتحدد لكل قطعة لحالها -
  بقى معتمد بالكامل على المنطقة/المدينة يلي الزبون يختارها بصفحة الدفع،
  ومحسوب على مستوى السلة كاملة لحظة تحويلها لطلب (شوف utils/
  shippingEngine.js بالباك اند). هاي الصفحة هي المصدر الوحيد لإدارة
  هالإعداد بالكامل

  - كل "منطقة شحن" بتغطي مجموعة مدن بنفس السعر ومدة التوصيل
  - الإضافة/التعديل عبر مودال موحّد (ShippingZoneModal)
  - التفعيل/الإيقاف السريع من الجدول مباشرة (بدون فتح المودال) - نفس
    فلسفة AdvancedFilters.jsx بالضبط
*/
const ShippingZones = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // null | "add" | zone object للتعديل

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/shipping-zones`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل مناطق الشحن");
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

  const handleToggleActive = async (zone) => {
    try {
      const res = await fetch(`${API_URL}/shipping-zones/${zone.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة المنطقة");
        return;
      }

      toast.success(result.message);
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleDelete = async (zone) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف منطقة "${zone.name}"؟ الطلبات السابقة اللي استخدمتها بتضل تعرض بياناتها القديمة كما هي.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/shipping-zones/${zone.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف المنطقة");
        return;
      }

      toast.success(result.message || "تم حذف منطقة الشحن");
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!data) return null;

  const { stats, zones } = data;

  return (
    <div className="coupons-page">
      {/* الهيدر */}
      <div className="coupons-header">
        <div>
          <h1 className="coupons-title">الشحن والتوصيل</h1>
          <p className="coupons-subtitle">
            إدارة مناطق الشحن وأسعارها ومدة التوصيل - هذا الإعداد يتحكم بسعر
            الشحن المحسوب على كامل السلة عند إتمام أي طلب
          </p>
        </div>
        <button
          type="button"
          className="coupons-add-btn"
          onClick={() => setModalMode("add")}
        >
          <FiPlus />
          إضافة منطقة
        </button>
      </div>

      {/* الإحصائيات */}
      <div className="shipping-zones-stats-grid">
        <StatCard
          icon={FiGrid}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={stats.totalZones}
          label="إجمالي المناطق"
        />
        <StatCard
          icon={FiCheckCircle}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          value={stats.activeZones}
          label="مناطق نشطة"
        />
        <StatCard
          icon={FiMapPin}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.totalCitiesCovered}
          label="إجمالي المدن المغطاة"
        />
      </div>

      {/* جدول مناطق الشحن */}
      <div className="coupons-table-wrapper">
        <table className="coupons-table">
          <thead>
            <tr>
              <th>منطقة الشحن</th>
              <th>المدن</th>
              <th>سعر الشحن</th>
              <th>شحن مجاني فوق</th>
              <th>مدة التوصيل</th>
              <th>نشط</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.id}>
                <td>
                  <strong>{zone.name}</strong>
                </td>
                <td>
                  <div className="shipping-zone-cities-cell">
                    {zone.cities.map((city) => (
                      <span className="shipping-zone-city-chip" key={city}>
                        {city}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="shipping-zone-price-cell">
                  {zone.price.toLocaleString("en-US")} ل.س
                </td>
                <td>
                  {zone.freeShippingThreshold ? (
                    <span className="shipping-zone-free-badge">
                      فوق {zone.freeShippingThreshold.toLocaleString("en-US")}{" "}
                      ل.س
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="shipping-zone-duration-cell">
                  {zone.durationLabel}
                </td>
                <td>
                  <ToggleSwitch
                    checked={zone.isActive}
                    onChange={() => handleToggleActive(zone)}
                  />
                </td>
                <td>
                  <ActionsDropdown
                    actions={[
                      {
                        label: "تعديل المنطقة",
                        icon: <FiEdit2 />,
                        onClick: () => setModalMode(zone),
                      },
                      {
                        label: "حذف المنطقة",
                        icon: <FiTrash2 />,
                        onClick: () => handleDelete(zone),
                        danger: true,
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}

            {zones.length === 0 && (
              <tr>
                <td colSpan={7} className="coupons-table-empty">
                  لا توجد مناطق شحن بعد - أضف أول منطقة عشان يقدر الزبائن يتموا
                  طلباتهم
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <ShippingZoneModal
          zone={modalMode === "add" ? null : modalMode}
          onClose={() => setModalMode(null)}
          onSaved={fetchOverview}
        />
      )}
    </div>
  );
};

export default ShippingZones;

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiSliders,
  FiCheckCircle,
  FiLayers,
  FiList,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiSearch,
  FiInfo,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { clearFilterValuesCache } from "../utils/filterValuesCache";
import StatCard from "../components/StatCard";
import ToggleSwitch from "../components/ToggleSwitch";
import FilterEditModal from "../components/FilterEditModal";

/*
  AdvancedFilters
  - صفحة "إدارة الفلاتر المتقدمة"
  - الفلاتر نفسها ثابتة (بيحددها الكود) - مفيش زر "إضافة فلتر جديد" ولا حذف فلتر
  - الأدمن بيقدر بس:
      1) يفعّل/يعطّل الفلتر (يظهر/يختفي عند المستخدم بالمتجر)
      2) يفتح "تعديل" عشان يدير القيم الداخلية (إضافة/تعديل/حذف) وإعدادات العرض
  - فلاتر valueType="system" (نطاق السعر، حالة التخفيض، للأعضاء فقط) مالهاش قيم
    تتضاف، بس بردو تقدر تفعّلها/تعطّلها
*/
const LEVEL_LABELS = { basic: "أساسي", advanced: "متقدم" };
const LEVEL_TABS = [
  { value: "all", label: "الكل" },
  { value: "basic", label: "أساسي" },
  { value: "advanced", label: "متقدم" },
];

const AdvancedFilters = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [levelTab, setLevelTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editingFilter, setEditingFilter] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/advanced-filters/overview`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات الفلاتر");
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

  const handleToggleFilterActive = async (filter) => {
    try {
      const res = await fetch(
        `${API_URL}/advanced-filters/${filter.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active: !filter.active }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الفلتر");
        return;
      }

      clearFilterValuesCache(filter.key);
      toast.success(
        filter.active
          ? "تم إخفاء الفلتر عن المستخدم"
          : "تم إظهار الفلتر للمستخدم",
      );
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleToggleValueActive = async (filter, value) => {
    try {
      const res = await fetch(
        `${API_URL}/advanced-filters/${filter.id}/values/${value.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active: !value.active }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث القيمة");
        return;
      }

      clearFilterValuesCache(filter.key);
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleModalSaved = (filterKey) => {
    clearFilterValuesCache(filterKey);
    fetchOverview();
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!data) return null;

  const { stats, filters } = data;

  const visibleFilters = filters.filter((f) => {
    if (levelTab !== "all" && f.level !== levelTab) return false;
    if (search && !f.displayName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="categories-page">
      {/* الهيدر */}
      <div className="categories-header">
        <div>
          <h1 className="categories-title">إدارة الفلاتر المتقدمة</h1>
          <p className="categories-subtitle">
            الفلاتر نفسها ثابتة بالنظام - تقدر تتحكم بظهورها وتدير القيم
            الداخلية لها فقط
          </p>
        </div>
      </div>

      <div className="advanced-filters-notice">
        <FiInfo />
        الفلاتر لا يمكن إضافتها أو حذفها. يمكنك تفعيل/تعطيل الفلتر لإظهاره أو
        إخفائه عند المستخدم، وإضافة أو تعديل أو حذف القيم الداخلية له فقط.
      </div>

      {/* الإحصائيات */}
      <div className="categories-stats-grid">
        <StatCard
          icon={FiSliders}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={stats.totalFilters}
          label="إجمالي الفلاتر"
        />
        <StatCard
          icon={FiCheckCircle}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          value={stats.activeFilters}
          label="فلاتر نشطة"
        />
        <StatCard
          icon={FiLayers}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.basicFilters}
          label="فلاتر أساسية"
        />
        <StatCard
          icon={FiList}
          iconBg="#fce7f3"
          iconColor="#ec4899"
          value={stats.advancedFilters}
          label="فلاتر متقدمة"
        />
      </div>

      {/* شريط الأدوات */}
      <div className="advanced-filters-toolbar">
        <div className="product-tag-options">
          {LEVEL_TABS.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className={`product-tag-option ${
                levelTab === tab.value ? "product-tag-option--active" : ""
              }`}
              onClick={() => setLevelTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="products-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث باسم الفلتر أو المفتاح..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* جدول الفلاتر */}
      <div className="categories-section">
        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th></th>
                <th>اسم الفلتر / المفتاح</th>
                <th>المستوى</th>
                <th>النوع</th>
                <th>المنتجات</th>
                <th>القيم</th>
                <th>نشط</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleFilters.map((filter) => {
                const isExpanded = expandedId === filter.id;
                const canExpand = filter.valueType === "list";
                return (
                  <React.Fragment key={filter.id}>
                    <tr>
                      <td>
                        {canExpand && (
                          <button
                            type="button"
                            className="advanced-filters-expand-btn"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : filter.id)
                            }
                          >
                            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="categories-table-name">
                          <span>{filter.displayName}</span>
                          <span className="advanced-filters-key">
                            {filter.key}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`advanced-filters-level advanced-filters-level--${filter.level}`}
                        >
                          {LEVEL_LABELS[filter.level]}
                        </span>
                      </td>
                      <td>
                        <span className="advanced-filters-type">
                          {filter.valueType === "list"
                            ? filter.isMultiValue
                              ? "اختيار متعدد"
                              : "اختيار واحد"
                            : "نظامي (محسوب تلقائيًا)"}
                        </span>
                      </td>
                      <td>{filter.productsCount}</td>
                      <td>
                        {filter.valueType === "list"
                          ? `${filter.activeValuesCount} / ${filter.valuesCount}`
                          : "—"}
                      </td>
                      <td>
                        <ToggleSwitch
                          checked={filter.active}
                          onChange={() => handleToggleFilterActive(filter)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="advanced-filters-edit-btn"
                          onClick={() => setEditingFilter(filter)}
                        >
                          <FiEdit2 />
                          تعديل
                        </button>
                      </td>
                    </tr>

                    {isExpanded && canExpand && (
                      <tr className="advanced-filters-values-row">
                        <td colSpan={8}>
                          {filter.values.length === 0 ? (
                            <p className="advanced-filters-empty-values">
                              لا توجد قيم مضافة بعد لهذا الفلتر
                            </p>
                          ) : (
                            <div className="advanced-filters-values-chips">
                              {filter.values.map((v) => (
                                <button
                                  type="button"
                                  key={v.id}
                                  className={`advanced-filters-value-chip ${
                                    v.active
                                      ? ""
                                      : "advanced-filters-value-chip--inactive"
                                  }`}
                                  onClick={() =>
                                    handleToggleValueActive(filter, v)
                                  }
                                  title={
                                    v.active
                                      ? "نشط - اضغط للإخفاء"
                                      : "مخفي - اضغط للتفعيل"
                                  }
                                >
                                  {v.colorHex && (
                                    <span
                                      className="advanced-filters-value-swatch"
                                      style={{ backgroundColor: v.colorHex }}
                                    />
                                  )}
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {visibleFilters.length === 0 && (
                <tr>
                  <td colSpan={8} className="categories-table-empty">
                    لا توجد فلاتر مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingFilter && (
        <FilterEditModal
          filterId={editingFilter.id}
          onClose={() => setEditingFilter(null)}
          onSaved={() => handleModalSaved(editingFilter.key)}
        />
      )}
    </div>
  );
};

export default AdvancedFilters;

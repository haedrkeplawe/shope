import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiXCircle,
} from "react-icons/fi";
import { API_URL } from "../config/api";

/*
  FilterEditModal
  - مودال "تعديل الفلتر" - جزئين:
    1) إعدادات عرض الفلتر نفسه (اسم العرض، المستوى، الترتيب، قابل للبحث،
       يظهر بالكمبيوتر/الموبايل) - إعدادات عرض بس، الفلتر نفسه ثابت
    2) إدارة القيم الداخلية (لو valueType = "list"): إضافة/تعديل/حذف/تفعيل
  - filterId: الفلتر المطلوب تعديله
  - onSaved: بيتنادى بعد أي حفظ ناجح (تعديل إعدادات أو تعديل قيمة) عشان الصفحة
    الأب تعمل ريفريش وتفضّي كاش القيم
*/
const FilterEditModal = ({ filterId, onClose, onSaved }) => {
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // إعدادات عرض الفلتر
  const [displayName, setDisplayName] = useState("");
  const [level, setLevel] = useState("basic");
  const [order, setOrder] = useState(1);
  const [searchable, setSearchable] = useState(false);
  const [showOnDesktop, setShowOnDesktop] = useState(true);
  const [showOnMobile, setShowOnMobile] = useState(true);

  // فورم إضافة قيمة جديدة
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColorHex, setNewColorHex] = useState("#cccccc");

  // تعديل قيمة موجودة
  const [editingValueId, setEditingValueId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColorHex, setEditColorHex] = useState("#cccccc");

  const isColorFilter = filter?.key === "color";

  const fetchFilter = async () => {
    try {
      const res = await fetch(`${API_URL}/advanced-filters/${filterId}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات الفلتر");
        onClose();
        return;
      }

      const f = result.filter;
      setFilter(f);
      setDisplayName(f.displayName);
      setLevel(f.level);
      setOrder(f.order);
      setSearchable(f.searchable);
      setShowOnDesktop(f.showOnDesktop);
      setShowOnMobile(f.showOnMobile);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/advanced-filters/${filterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName,
          level,
          order: Number(order),
          searchable,
          showOnDesktop,
          showOnMobile,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ إعدادات الفلتر");
        return;
      }

      toast.success("تم حفظ إعدادات الفلتر بنجاح");
      onSaved();
      fetchFilter();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSaving(false);
    }
  };

  const handleAddValue = async () => {
    if (!newValue.trim() || !newLabel.trim()) {
      toast.error("لازم تحدد القيمة الداخلية واسم العرض");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/advanced-filters/${filterId}/values`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            value: newValue,
            label: newLabel,
            colorHex: isColorFilter ? newColorHex : null,
          }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إضافة القيمة");
        return;
      }

      toast.success("تم إضافة القيمة بنجاح");
      setNewValue("");
      setNewLabel("");
      setNewColorHex("#cccccc");
      onSaved();
      fetchFilter();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const startEditValue = (v) => {
    setEditingValueId(v.id);
    setEditLabel(v.label);
    setEditColorHex(v.colorHex || "#cccccc");
  };

  const cancelEditValue = () => {
    setEditingValueId(null);
  };

  const handleUpdateValue = async (valueId) => {
    if (!editLabel.trim()) {
      toast.error("اسم العرض مطلوب");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/advanced-filters/${filterId}/values/${valueId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            label: editLabel,
            colorHex: isColorFilter ? editColorHex : undefined,
          }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث القيمة");
        return;
      }

      toast.success("تم تحديث القيمة بنجاح");
      setEditingValueId(null);
      onSaved();
      fetchFilter();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleToggleValueActive = async (v) => {
    try {
      const res = await fetch(
        `${API_URL}/advanced-filters/${filterId}/values/${v.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active: !v.active }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث القيمة");
        return;
      }

      onSaved();
      fetchFilter();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleDeleteValue = async (v) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${v.label}"؟ ${
        v.productsCount > 0
          ? `تحذير: ${v.productsCount} منتج يستخدم هذه القيمة حاليًا.`
          : ""
      }`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_URL}/advanced-filters/${filterId}/values/${v.id}`,
        { method: "DELETE", credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف القيمة");
        return;
      }

      toast.success("تم حذف القيمة بنجاح");
      onSaved();
      fetchFilter();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  return (
    <div className="advanced-filter-modal-overlay" onClick={onClose}>
      <div
        className="advanced-filter-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="advanced-filter-modal-header">
          <h3>تعديل: {filter?.displayName || "..."}</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {loading || !filter ? (
          <div className="categories-loading">جاري التحميل...</div>
        ) : (
          <div className="advanced-filter-modal-body">
            {/* إعدادات عرض الفلتر */}
            <div className="advanced-filter-modal-two-cols">
              <div className="category-form-group">
                <label>المفتاح الداخلي (ثابت)</label>
                <input type="text" value={filter.key} disabled />
              </div>
              <div className="category-form-group">
                <label>اسم العرض للمتجر</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="advanced-filter-modal-two-cols">
              <div className="category-form-group">
                <label>المستوى</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="basic">أساسي</option>
                  <option value="advanced">متقدم</option>
                </select>
              </div>
              <div className="category-form-group">
                <label>ترتيب الظهور</label>
                <input
                  type="number"
                  min={1}
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                />
              </div>
            </div>

            <div className="advanced-filter-modal-toggles">
              <label className="advanced-filter-modal-toggle-row">
                <span>قابل للبحث</span>
                <input
                  type="checkbox"
                  checked={searchable}
                  onChange={(e) => setSearchable(e.target.checked)}
                />
              </label>
              <label className="advanced-filter-modal-toggle-row">
                <span>يظهر في الكمبيوتر</span>
                <input
                  type="checkbox"
                  checked={showOnDesktop}
                  onChange={(e) => setShowOnDesktop(e.target.checked)}
                />
              </label>
              <label className="advanced-filter-modal-toggle-row">
                <span>يظهر في الموبايل</span>
                <input
                  type="checkbox"
                  checked={showOnMobile}
                  onChange={(e) => setShowOnMobile(e.target.checked)}
                />
              </label>
            </div>

            <button
              type="button"
              className="category-form-submit advanced-filter-modal-save-settings"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? "جاري الحفظ..." : "حفظ إعدادات الفلتر"}
            </button>

            {/* إدارة القيم */}
            {filter.valueType === "list" ? (
              <div className="advanced-filter-modal-values">
                <h4>قيم الفلتر</h4>

                <div className="advanced-filter-modal-values-list">
                  {filter.values.map((v) => (
                    <div className="advanced-filter-value-row" key={v.id}>
                      {editingValueId === v.id ? (
                        <>
                          {isColorFilter && (
                            <input
                              type="color"
                              value={editColorHex}
                              onChange={(e) => setEditColorHex(e.target.value)}
                              className="advanced-filter-color-input"
                            />
                          )}
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="advanced-filter-value-edit-input"
                          />
                          <button
                            type="button"
                            className="advanced-filter-value-icon-btn advanced-filter-value-icon-btn--ok"
                            onClick={() => handleUpdateValue(v.id)}
                          >
                            <FiCheck />
                          </button>
                          <button
                            type="button"
                            className="advanced-filter-value-icon-btn"
                            onClick={cancelEditValue}
                          >
                            <FiXCircle />
                          </button>
                        </>
                      ) : (
                        <>
                          {v.colorHex && (
                            <span
                              className="advanced-filters-value-swatch"
                              style={{ backgroundColor: v.colorHex }}
                            />
                          )}
                          <span className="advanced-filter-value-label">
                            {v.label}
                          </span>
                          <span className="advanced-filter-value-usage">
                            {v.productsCount} منتج
                          </span>
                          <label className="advanced-filter-value-active-toggle">
                            <input
                              type="checkbox"
                              checked={v.active}
                              onChange={() => handleToggleValueActive(v)}
                            />
                          </label>
                          <button
                            type="button"
                            className="advanced-filter-value-icon-btn"
                            onClick={() => startEditValue(v)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="advanced-filter-value-icon-btn advanced-filter-value-icon-btn--danger"
                            onClick={() => handleDeleteValue(v)}
                          >
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {filter.values.length === 0 && (
                    <p className="advanced-filters-empty-values">
                      لا توجد قيم مضافة بعد
                    </p>
                  )}
                </div>

                <div className="advanced-filter-add-value-row">
                  {isColorFilter && (
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="advanced-filter-color-input"
                    />
                  )}
                  <input
                    type="text"
                    placeholder="القيمة الداخلية (مثال: navy)"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="اسم العرض (مثال: كحلي)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                  <button
                    type="button"
                    className="advanced-filter-add-value-btn"
                    onClick={handleAddValue}
                  >
                    <FiPlus />
                    إضافة قيمة
                  </button>
                </div>
              </div>
            ) : (
              <p className="advanced-filters-empty-values">
                هذا الفلتر نظامي ومبني على بيانات محسوبة تلقائيًا من المنتجات
                (مثل السعر أو حالة التخفيض)، ومالوش قيم تتضاف يدويًا.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterEditModal;

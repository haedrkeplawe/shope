import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiPlus } from "react-icons/fi";
import { API_URL } from "../config/api";
import ToggleSwitch from "./ToggleSwitch";

/*
  ShippingZoneModal
  - مودال موحّد للإضافة والتعديل سوا (zone=null يعني إضافة جديدة)
  - المدن بتتدار كشرائح (Chips): إضافة بالضغط على Enter أو زر "إضافة"،
    حذف بالضغط على × جنب كل شريحة - نفس فكرة إدارة قيم الفلتر بمودال
    "تعديل الفلتر" (FilterEditModal) بس أبسط (بدون تعديل داخلي لكل شريحة)
  - onSaved: بتتنادى بعد أي حفظ ناجح عشان الصفحة الأب تعمل ريفريش
*/
const ShippingZoneModal = ({ zone, onClose, onSaved }) => {
  const isEdit = Boolean(zone);

  const [name, setName] = useState(zone?.name || "");
  const [cities, setCities] = useState(zone?.cities || []);
  const [cityInput, setCityInput] = useState("");
  const [price, setPrice] = useState(zone?.price ?? "");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    zone?.freeShippingThreshold ?? "",
  );
  const [deliveryDurationMin, setDeliveryDurationMin] = useState(
    zone?.deliveryDurationMin ?? "",
  );
  const [deliveryDurationMax, setDeliveryDurationMax] = useState(
    zone?.deliveryDurationMax ?? "",
  );
  const [isActive, setIsActive] = useState(zone ? zone.isActive : true);
  const [saving, setSaving] = useState(false);

  // لو المودال انفتح على منطقة تانية (بدون إغلاق) - نادرًا بس احتياطًا
  useEffect(() => {
    setName(zone?.name || "");
    setCities(zone?.cities || []);
    setPrice(zone?.price ?? "");
    setFreeShippingThreshold(zone?.freeShippingThreshold ?? "");
    setDeliveryDurationMin(zone?.deliveryDurationMin ?? "");
    setDeliveryDurationMax(zone?.deliveryDurationMax ?? "");
    setIsActive(zone ? zone.isActive : true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone?.id]);

  const handleAddCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;

    const exists = cities.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast.error("هذه المدينة مضافة أصلاً بالقائمة");
      return;
    }

    setCities((prev) => [...prev, trimmed]);
    setCityInput("");
  };

  const handleRemoveCity = (city) => {
    setCities((prev) => prev.filter((c) => c !== city));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("اسم منطقة الشحن مطلوب");
      return;
    }
    if (cities.length === 0) {
      toast.error("لازم تضيف مدينة واحدة على الأقل");
      return;
    }
    if (price === "" || Number(price) < 0) {
      toast.error("سعر الشحن غير صالح");
      return;
    }
    if (deliveryDurationMin === "" || deliveryDurationMax === "") {
      toast.error("مدة التوصيل (الحد الأدنى والأقصى) مطلوبة");
      return;
    }
    if (Number(deliveryDurationMin) > Number(deliveryDurationMax)) {
      toast.error("الحد الأدنى لمدة التوصيل لازم يكون أقل أو يساوي الأقصى");
      return;
    }

    const payload = {
      name: name.trim(),
      cities,
      price: Number(price),
      freeShippingThreshold:
        freeShippingThreshold === "" ? null : Number(freeShippingThreshold),
      deliveryDurationMin: Number(deliveryDurationMin),
      deliveryDurationMax: Number(deliveryDurationMax),
      ...(isEdit ? { isActive } : {}),
    };

    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/shipping-zones${isEdit ? `/${zone.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ منطقة الشحن");
        return;
      }

      toast.success(result.message);
      onSaved();
      onClose();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="advanced-filter-modal-overlay" onClick={onClose}>
      <div
        className="advanced-filter-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="advanced-filter-modal-header">
          <h3>{isEdit ? `تعديل: ${zone.name}` : "إضافة منطقة شحن جديدة"}</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="advanced-filter-modal-body">
          <div className="category-form-group">
            <label>اسم منطقة الشحن</label>
            <input
              type="text"
              placeholder="مثال: دمشق وريفها"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="category-form-group">
            <label>المدن المشمولة</label>
            {cities.length === 0 ? (
              <p className="shipping-zone-modal-empty-cities">
                لسه ما ضفت أي مدينة
              </p>
            ) : (
              <div className="shipping-zone-modal-cities-list">
                {cities.map((city) => (
                  <span className="shipping-zone-modal-city-chip" key={city}>
                    {city}
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(city)}
                    >
                      <FiX />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="shipping-zone-add-city-row">
              <input
                type="text"
                placeholder="اسم المدينة"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCity();
                  }
                }}
              />
              <button
                type="button"
                className="shipping-zone-add-city-btn"
                onClick={handleAddCity}
              >
                <FiPlus />
                إضافة
              </button>
            </div>
          </div>

          <div className="advanced-filter-modal-two-cols">
            <div className="category-form-group">
              <label>سعر الشحن (ل.س)</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="category-form-group">
              <label>شحن مجاني فوق (اختياري)</label>
              <input
                type="number"
                min={0}
                placeholder="بلا حد أدنى"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
              />
            </div>
          </div>
          <p className="shipping-zone-modal-hint">
            اتركه فاضي لو ما في شحن مجاني بهذه المنطقة إطلاقًا
          </p>

          <div className="advanced-filter-modal-two-cols">
            <div className="category-form-group">
              <label>مدة التوصيل - من (أيام)</label>
              <input
                type="number"
                min={0}
                placeholder="1"
                value={deliveryDurationMin}
                onChange={(e) => setDeliveryDurationMin(e.target.value)}
              />
            </div>
            <div className="category-form-group">
              <label>مدة التوصيل - إلى (أيام)</label>
              <input
                type="number"
                min={0}
                placeholder="2"
                value={deliveryDurationMax}
                onChange={(e) => setDeliveryDurationMax(e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <label className="advanced-filter-modal-toggle-row">
              <span>منطقة نشطة (تظهر للزبون بصفحة الدفع)</span>
              <ToggleSwitch checked={isActive} onChange={setIsActive} />
            </label>
          )}

          <button
            type="button"
            className="category-form-submit advanced-filter-modal-save-settings"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? "جاري الحفظ..."
              : isEdit
              ? "حفظ التعديلات"
              : "إضافة المنطقة"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingZoneModal;

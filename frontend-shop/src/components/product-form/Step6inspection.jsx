import React from "react";
import { FiShield, FiCheck, FiX } from "react-icons/fi";
import { SEVERITY_OPTIONS } from "../../constants/Productoptions";

/*
  Step6Inspection
  - قائمة فحص ثابتة (8 عناصر) لكل قطعة
  - كل عنصر: سليم / يوجد عيب - لو "يوجد عيب" بتظهر حقول شدة العيب ووصفه
*/
const Step6Inspection = ({ formData, updateField }) => {
  const items = formData.inspectionReport || [];

  const updateItem = (index, changes) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...changes } : item,
    );
    updateField("inspectionReport", next);
  };

  const setStatus = (index, status) => {
    if (status === "ok") {
      updateItem(index, { status: "ok", severity: null, description: "" });
    } else {
      updateItem(index, { status: "defect" });
    }
  };

  return (
    <div className="product-form-cards">
      <div className="product-form-card">
        <div className="product-inspection-banner">
          <FiShield />
          <div>
            <span className="product-inspection-banner-title">تقرير الفحص</span>
            <span className="product-inspection-banner-desc">
              يجب فحص كل عناصر القطعة بدقة
            </span>
          </div>
        </div>
      </div>

      <div className="product-form-card">
        <h3 className="product-form-card-title">قائمة الفحص التفصيلية</h3>

        <div className="product-inspection-list">
          {items.map((item, index) => {
            const hasDefect = item.status === "defect";
            return (
              <div
                key={item.key}
                className={`product-inspection-item ${
                  hasDefect ? "product-inspection-item--defect" : ""
                }`}
              >
                <div className="product-inspection-item-header">
                  <span className="product-inspection-item-label">
                    {item.label}
                  </span>
                  <div className="product-inspection-toggle">
                    <button
                      type="button"
                      className={`product-inspection-toggle-btn product-inspection-toggle-btn--ok ${
                        !hasDefect
                          ? "product-inspection-toggle-btn--active"
                          : ""
                      }`}
                      onClick={() => setStatus(index, "ok")}
                    >
                      <FiCheck />
                      سليم
                    </button>
                    <button
                      type="button"
                      className={`product-inspection-toggle-btn product-inspection-toggle-btn--defect ${
                        hasDefect ? "product-inspection-toggle-btn--active" : ""
                      }`}
                      onClick={() => setStatus(index, "defect")}
                    >
                      <FiX />
                      يوجد عيب
                    </button>
                  </div>
                </div>

                {hasDefect && (
                  <div className="product-inspection-defect-details">
                    <div className="product-form-group">
                      <label>شدة العيب</label>
                      <div className="product-tag-options">
                        {SEVERITY_OPTIONS.map((sev) => (
                          <button
                            type="button"
                            key={sev.value}
                            className={`product-tag-option ${
                              item.severity === sev.value
                                ? "product-tag-option--active"
                                : ""
                            }`}
                            onClick={() =>
                              updateItem(index, { severity: sev.value })
                            }
                          >
                            {sev.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="product-form-group">
                      <label>وصف العيب</label>
                      <input
                        type="text"
                        placeholder="اوصف العيب بدقة للمشتري..."
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, { description: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Step6Inspection;

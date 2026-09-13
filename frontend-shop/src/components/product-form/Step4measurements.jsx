import React from "react";
import { FiStar, FiMaximize2 } from "react-icons/fi";
import useFilterValues from "../../hooks/useFilterValues";

/*
  Step4Measurements
  - مؤشر الجودة: بالنجوم - بقى فلتر مستقل بالكامل "quality_rating"، مش مرتبط
    ولا مشارك بقيم "حالة القطعة" زي ما كان قبل كده
  - المقاسات التفصيلية: 6 قياسات بالسم + ملاحظة للمشتري

  ⚠️ عدد النجوم بيتحسب تلقائيًا حسب ترتيب القيمة بين قيم الفلتر (أول قيمة = 5
  نجوم، وهكذا تنازليًا) عشان يفضل شغال حتى لو الأدمن ضاف/رتّب قيم جديدة
*/
const Step4Measurements = ({ formData, updateField }) => {
  const { values: qualityOptions } = useFilterValues("quality_rating");

  const updateMeasurement = (key, value) => {
    updateField("measurements", { ...formData.measurements, [key]: value });
  };

  const MEASUREMENT_FIELDS = [
    { key: "chestWidth", label: "عرض الصدر" },
    { key: "shoulderWidth", label: "عرض الكتفين" },
    { key: "totalLength", label: "الطول الكلي" },
    { key: "sleeveLength", label: "طول الكم" },
    { key: "waist", label: "الخصر" },
    { key: "hip", label: "الورك" },
  ];

  return (
    <div className="product-form-cards">
      {/* مؤشر الجودة */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiStar />
          مؤشر الجودة
        </h3>

        <div className="product-quality-options">
          {qualityOptions.map((option, index) => {
            const stars = Math.max(1, 5 - index);
            return (
              <button
                type="button"
                key={option.value}
                className={`product-quality-option ${
                  formData.qualityRating === option.value
                    ? "product-quality-option--active"
                    : ""
                }`}
                onClick={() => updateField("qualityRating", option.value)}
              >
                <span className="product-quality-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FiStar
                      key={i}
                      className={
                        i < stars ? "product-star-filled" : "product-star-empty"
                      }
                    />
                  ))}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* المقاسات التفصيلية */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiMaximize2 />
          المقاسات التفصيلية
        </h3>

        <div className="product-measure-banner">
          جميع المقاسات بالسنتيمتر (سم) وتُقاس على القطعة المسطحة
        </div>

        <div className="product-measure-fields">
          {MEASUREMENT_FIELDS.map((field) => (
            <div className="product-measure-row" key={field.key}>
              <label>{field.label}</label>
              <div className="product-measure-input">
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={formData.measurements[field.key]}
                  onChange={(e) => updateMeasurement(field.key, e.target.value)}
                />
                <span className="product-measure-unit">سم</span>
              </div>
            </div>
          ))}
        </div>

        <div className="product-form-group product-measure-note">
          <label>ملاحظة للمشتري</label>
          <textarea
            rows={3}
            placeholder="مثال: ينصح بأخذ المقاس على جسم العميل مباشرةً للدقة..."
            value={formData.buyerNote}
            onChange={(e) => updateField("buyerNote", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default Step4Measurements;

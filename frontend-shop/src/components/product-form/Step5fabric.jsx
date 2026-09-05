import React from "react";
import { FiScissors, FiLayers, FiPlus, FiX, FiDroplet } from "react-icons/fi";
import { CARE_INSTRUCTIONS_OPTIONS } from "../../constants/Productoptions";
import useFilterValues from "../../hooks/useFilterValues";

/*
  Step5Fabric
  - نوع القماش: القماش الرئيسي، كثافة القماش، مرونة القماش
  - تركيب القماش: نسب ألياف قابلة للإضافة/الحذف، ولازم مجموعها = 100%
  - تعليمات العناية: طرق الغسيل الموصى بها (multi-select) - ثابتة، مش فلتر

  ⚠️ تصحيح مهم: قبل كده كان في لخبطة - حقل "مرونة القماش" بالواجهة كان فعليًا
  بيخزن بحقل fabricDensity وبخيارات كثافة (خفيف/متوسط/ثقيل)! دلوقتي بقى كل
  حقل مربوط بفلتره الصحيح: "كثافة القماش" (fabric_density) و"مرونة القماش"
  (fabric_elasticity) منفصلين تمامًا زي ما هو موجود أصلًا بالموديل
  - "ملاءمة الموسم" اتشالت من هون لأنها اندمجت مع حقل "الموسم" بالخطوة الأولى
*/
const Step5Fabric = ({ formData, updateField }) => {
  const { values: fabricOptions } = useFilterValues("fabric_type");
  const { values: fabricDensityOptions } = useFilterValues("fabric_density");
  const { values: fabricElasticityOptions } =
    useFilterValues("fabric_elasticity");

  const composition = formData.fabricComposition || [];
  const total = composition.reduce(
    (sum, item) => sum + (Number(item.percentage) || 0),
    0,
  );
  const isComplete = total === 100;

  const addMaterial = () => {
    updateField("fabricComposition", [
      ...composition,
      { material: fabricOptions[0]?.value || "", percentage: 0 },
    ]);
  };

  const updateMaterial = (index, changes) => {
    const next = composition.map((item, i) =>
      i === index ? { ...item, ...changes } : item,
    );
    updateField("fabricComposition", next);
  };

  const removeMaterial = (index) => {
    updateField(
      "fabricComposition",
      composition.filter((_, i) => i !== index),
    );
  };

  const toggleCareInstruction = (instruction) => {
    const current = formData.careInstructions || [];
    const next = current.includes(instruction)
      ? current.filter((c) => c !== instruction)
      : [...current, instruction];
    updateField("careInstructions", next);
  };

  return (
    <div className="product-form-cards">
      {/* نوع القماش */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiScissors />
          نوع القماش
        </h3>

        <div className="product-form-group">
          <label>القماش الرئيسي</label>
          <div className="product-tag-options">
            {fabricOptions.map((fabric) => (
              <button
                type="button"
                key={fabric.value}
                className={`product-tag-option ${
                  formData.mainFabric === fabric.value
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => updateField("mainFabric", fabric.value)}
              >
                {fabric.label}
              </button>
            ))}
          </div>
        </div>

        <div className="product-form-group">
          <label>كثافة القماش</label>
          <div className="product-tag-options">
            {fabricDensityOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`product-tag-option ${
                  formData.fabricDensity === option.value
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => updateField("fabricDensity", option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="product-form-group">
          <label>مرونة القماش</label>
          <div className="product-tag-options">
            {fabricElasticityOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`product-tag-option ${
                  formData.fabricElasticity === option.value
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => updateField("fabricElasticity", option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* تركيب القماش */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiLayers />
          تركيب القماش (نسب الألياف)
        </h3>

        <div className="product-composition-list">
          {composition.map((item, index) => (
            <div className="product-composition-row" key={index}>
              <div className="product-composition-percentage">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={item.percentage}
                  onChange={(e) =>
                    updateMaterial(index, { percentage: e.target.value })
                  }
                />
                <span>%</span>
              </div>

              <select
                className="product-composition-select"
                value={item.material}
                onChange={(e) =>
                  updateMaterial(index, { material: e.target.value })
                }
              >
                {fabricOptions.map((fabric) => (
                  <option key={fabric.value} value={fabric.value}>
                    {fabric.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="product-composition-remove"
                onClick={() => removeMaterial(index)}
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="product-add-material-btn"
          onClick={addMaterial}
        >
          <FiPlus />
          إضافة خامة
        </button>

        <p
          className={`product-composition-total ${
            isComplete
              ? "product-composition-total--ok"
              : "product-composition-total--warning"
          }`}
        >
          المجموع: {total}% (يجب أن يساوي 100%)
        </p>
      </div>

      {/* تعليمات العناية */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiDroplet />
          تعليمات العناية
        </h3>

        <div className="product-form-group">
          <label>طرق الغسيل والعناية الموصى بها</label>
          <div className="product-tag-options">
            {CARE_INSTRUCTIONS_OPTIONS.map((instruction) => (
              <button
                type="button"
                key={instruction}
                className={`product-tag-option ${
                  formData.careInstructions.includes(instruction)
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => toggleCareInstruction(instruction)}
              >
                {instruction}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step5Fabric;

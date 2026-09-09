import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiTag, FiStar, FiHash, FiRefreshCw } from "react-icons/fi";
import { API_URL } from "../../config/api";
import useFilterValues from "../../hooks/useFilterValues";

/*
  Step1BasicInfo
  - اسم المنتج، الفئة (رئيسية + فرعية مرتبطة بنظام الفئات)، نوع القطعة، الجنس
  - الماركة والموسم
  - الألوان والمقاسات المتاحة (multi-select) + حالة القطعة

  ⚠️ نوع القطعة، الجنس، الماركة، الموسم، الألوان، المقاسات، حالة القطعة
  كلهم بقوا مرتبطين بـ"الفلاتر المتقدمة" - القيم بتتجاب ديناميكيًا عن طريق
  useFilterValues(key) بدل ما تكون ثابتة بالكود
*/
const Step1BasicInfo = ({ formData, updateField }) => {
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [generatingSku, setGeneratingSku] = useState(false);

  const { values: pieceTypeOptions } = useFilterValues("piece_type");
  const { values: genderOptions } = useFilterValues("gender");
  const { values: seasonOptions } = useFilterValues("season");
  const { values: colorOptions } = useFilterValues("color");
  const { values: sizeOptions } = useFilterValues("size");
  const { values: conditionOptions } = useFilterValues("condition");
  const { values: brandOptions } = useFilterValues("brand");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/categories/overview`, {
          credentials: "include",
        });
        const result = await res.json();
        if (res.ok) {
          setMainCategories(result.mainCategories || []);
          setSubCategories(result.subCategories || []);
        }
      } catch (error) {
        // تجاهل، هيفضل ممكن يدخل باقي بيانات المنتج من غير الفئة
      }
    };
    fetchCategories();
  }, []);

  // في وضع التعديل: لو الفئة المحفوظة فرعية، حدد القسم الرئيسي التابعة له تلقائيًا
  useEffect(() => {
    if (!formData.categoryId || mainCategories.length === 0) return;

    const isMain = mainCategories.some((m) => m.id === formData.categoryId);
    if (isMain) {
      setSelectedMainId(formData.categoryId);
      return;
    }

    const sub = subCategories.find((s) => s.id === formData.categoryId);
    if (sub) setSelectedMainId(sub.parentId);
  }, [formData.categoryId, mainCategories, subCategories]);

  const visibleSubCategories = subCategories.filter(
    (sub) => sub.parentId === selectedMainId,
  );

  const handleSelectMain = (mainId) => {
    setSelectedMainId(mainId);
    // افتراضيًا نخزن القسم الرئيسي نفسه، لحد ما يختار فئة فرعية معينة
    updateField("categoryId", mainId);
  };

  const handleSelectSub = (subId) => {
    const alreadySelected = formData.categoryId === subId;
    updateField("categoryId", alreadySelected ? selectedMainId : subId);
  };

  const toggleArrayValue = (field, value) => {
    const current = formData[field] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateField(field, next);
  };

  const handleGenerateSku = async () => {
    setGeneratingSku(true);
    try {
      const res = await fetch(
        `${API_URL}/products/generate-sku?categoryId=${
          formData.categoryId || ""
        }`,
        { credentials: "include" },
      );
      const result = await res.json();
      if (res.ok) {
        updateField("sku", result.sku);
      } else {
        toast.error(result.message || "تعذر توليد الرمز");
      }
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setGeneratingSku(false);
    }
  };

  return (
    <div className="product-form-cards">
      {/* اسم المنتج والفئة */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiTag />
          اسم المنتج والفئة
        </h3>

        <div className="product-form-group">
          <label>اسم المنتج *</label>
          <input
            type="text"
            placeholder="مثال: بلايزر كلاسيكي بيج فاتح"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>

        <div className="product-form-two-cols">
          <div className="product-form-group">
            <label>الفئة الفرعية</label>
            <div className="product-tag-options">
              {visibleSubCategories.length === 0 ? (
                <span className="product-form-hint">
                  اختر قسمًا رئيسيًا أولًا
                </span>
              ) : (
                visibleSubCategories.map((sub) => (
                  <button
                    type="button"
                    key={sub.id}
                    className={`product-tag-option ${
                      formData.categoryId === sub.id
                        ? "product-tag-option--active"
                        : ""
                    }`}
                    onClick={() => handleSelectSub(sub.id)}
                  >
                    {sub.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="product-form-group">
            <label>الفئة الرئيسية *</label>
            <div className="product-tag-options">
              {mainCategories.map((main) => (
                <button
                  type="button"
                  key={main.id}
                  className={`product-tag-option ${
                    selectedMainId === main.id
                      ? "product-tag-option--active"
                      : ""
                  }`}
                  onClick={() => handleSelectMain(main.id)}
                >
                  {main.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="product-form-group">
          <label>نوع القطعة *</label>
          <div className="product-tag-options">
            {pieceTypeOptions.map((type) => (
              <button
                type="button"
                key={type.value}
                className={`product-tag-option ${
                  formData.pieceType === type.value
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => updateField("pieceType", type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="product-form-group">
          <label>الجنس *</label>
          <div className="product-tag-options">
            {genderOptions.map((g) => (
              <button
                type="button"
                key={g.value}
                className={`product-tag-option ${
                  formData.gender === g.value
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => updateField("gender", g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* الماركة والموسم */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiStar />
          الماركة والموسم
        </h3>

        <div className="product-form-two-cols">
          <div className="product-form-group">
            <label>الموسم</label>
            <div className="product-tag-options">
              {seasonOptions.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  className={`product-tag-option ${
                    formData.season === s.value
                      ? "product-tag-option--active"
                      : ""
                  }`}
                  onClick={() => updateField("season", s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="product-form-group">
            <label>الماركة</label>
            <div className="product-tag-options">
              {brandOptions.length === 0 ? (
                <span className="product-form-hint">
                  لا توجد ماركات مضافة بعد - أضفها من صفحة الفلاتر المتقدمة
                </span>
              ) : (
                brandOptions.map((b) => (
                  <button
                    type="button"
                    key={b.value}
                    className={`product-tag-option ${
                      formData.brand === b.value
                        ? "product-tag-option--active"
                        : ""
                    }`}
                    onClick={() => updateField("brand", b.value)}
                  >
                    {b.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* الألوان والمقاسات */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiTag />
          الألوان والمقاسات
        </h3>

        <div className="product-form-group">
          <label>الألوان المتاحة *</label>
          <div className="product-tag-options">
            {colorOptions.map((color) => (
              <button
                type="button"
                key={color.value}
                className={`product-tag-option ${
                  formData.colors.includes(color.value)
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => toggleArrayValue("colors", color.value)}
              >
                {color.label}
              </button>
            ))}
          </div>
        </div>

        <div className="product-form-group">
          <label>المقاسات المتاحة *</label>
          <div className="product-tag-options">
            {sizeOptions.map((size) => (
              <button
                type="button"
                key={size.value}
                className={`product-tag-option ${
                  formData.sizes.includes(size.value)
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => toggleArrayValue("sizes", size.value)}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="product-form-group">
          <label>حالة القطعة *</label>
          <div className="product-tag-options">
            {conditionOptions.map((c) => (
              <button
                type="button"
                key={c.value}
                className={`product-tag-option ${
                  formData.condition === c.value
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => updateField("condition", c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* رمز المنتج والكمية */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiHash />
          رمز المنتج (SKU) والكمية
        </h3>

        <div className="product-form-two-cols">
          <div className="product-form-group">
            <label>رمز SKU</label>
            <div className="product-sku-row">
              <button
                type="button"
                className="product-sku-generate-btn"
                onClick={handleGenerateSku}
                disabled={generatingSku}
              >
                <FiRefreshCw className={generatingSku ? "product-spin" : ""} />
                توليد تلقائي
              </button>
              <input
                type="text"
                placeholder="TRZ-NS-00001"
                value={formData.sku}
                onChange={(e) => updateField("sku", e.target.value)}
              />
            </div>
            <p className="product-form-hint">
              سيتم توليد الرمز تلقائيًا بناءً على الفئة والرقم التسلسلي لو تركته
              فاضي
            </p>
          </div>

          <div className="product-form-group">
            <label>الكمية المتوفرة</label>
            <input
              type="number"
              min={0}
              value={formData.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1BasicInfo;

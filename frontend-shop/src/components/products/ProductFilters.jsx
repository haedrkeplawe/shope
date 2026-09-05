import React from "react";
import useFilterValues from "../../hooks/useFilterValues";

/*
  ProductFilters
  - لوحة الفلاتر المتقدمة - كل فلتر عبارة عن سطر أفقي واحد (تسمية + خيارات جنب بعض)
  - filters: كائن فيه كل قيم الفلاتر الحالية
  - onChange(key, value): بتحدث فلتر واحد
  - onReset / onApply

  ⚠️ نوع المنتج، الجنس، المقاس، الألوان، حالة القطعة، والماركة بقوا بيتجابوا
  ديناميكيًا من "الفلاتر المتقدمة" بدل الخيارات الثابتة القديمة
*/
const ProductFilters = ({
  filters,
  onChange,
  onReset,
  onApply,
  mainCategories = [],
  subCategories = [],
}) => {
  const { values: pieceTypeOptions } = useFilterValues("piece_type");
  const { values: genderOptions } = useFilterValues("gender");
  const { values: sizeOptions } = useFilterValues("size");
  const { values: colorOptions } = useFilterValues("color");
  const { values: conditionOptions } = useFilterValues("condition");
  const { values: brandOptions } = useFilterValues("brand");

  const colorHexMap = colorOptions.reduce((acc, c) => {
    acc[c.value] = c.colorHex;
    return acc;
  }, {});

  const renderRow = (label, key, options, { colorSwatch = false } = {}) => (
    <div className="product-filter-row">
      <span className="product-filter-row-label">{label}</span>
      <div className="product-tag-options">
        <button
          type="button"
          className={`product-tag-option ${
            !filters[key] || filters[key] === "all"
              ? "product-tag-option--active"
              : ""
          }`}
          onClick={() => onChange(key, "all")}
        >
          الكل
        </button>
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const label2 = typeof opt === "string" ? opt : opt.label;
          return (
            <button
              type="button"
              key={value}
              className={`product-tag-option ${
                colorSwatch ? "product-tag-option--color" : ""
              } ${filters[key] === value ? "product-tag-option--active" : ""}`}
              onClick={() => onChange(key, value)}
            >
              {colorSwatch && (
                <span
                  className="product-color-swatch"
                  style={{ backgroundColor: colorHexMap[value] || "#ccc" }}
                />
              )}
              {label2}
            </button>
          );
        })}
      </div>
    </div>
  );

  const specialFilters = [
    { key: "hasVideo", label: "يحتوي فيديو" },
    { key: "hasDiscount", label: "يوجد خصم" },
    { key: "freeShipping", label: "شحن مجاني" },
    { key: "featured", label: "منتج مميز" },
    { key: "isNewArrival", label: "منتج جديد" },
    { key: "membersOnly", label: "للأعضاء فقط" },
  ];

  // نحدد القسم الرئيسي المختار حاليًا سواء اخترناه هو نفسه أو اخترنا فئة فرعية تابعة له
  const selectedMainId = (() => {
    if (!filters.categoryId || filters.categoryId === "all") return "all";
    if (mainCategories.some((m) => m.id === filters.categoryId)) {
      return filters.categoryId;
    }
    const sub = subCategories.find((s) => s.id === filters.categoryId);
    return sub?.parentId || "all";
  })();

  const visibleSubCategories = subCategories.filter(
    (sub) => sub.parentId === selectedMainId,
  );

  const handleSelectMain = (mainId) => {
    onChange("categoryId", mainId);
  };

  const handleSelectSub = (subId) => {
    onChange("categoryId", subId);
  };

  return (
    <div className="product-filters-panel">
      <div className="product-filter-row">
        <span className="product-filter-row-label">الأقسام الرئيسية</span>
        <div className="product-tag-options">
          <button
            type="button"
            className={`product-tag-option ${
              selectedMainId === "all" ? "product-tag-option--active" : ""
            }`}
            onClick={() => handleSelectMain("all")}
          >
            الكل
          </button>
          {mainCategories.map((main) => (
            <button
              type="button"
              key={main.id}
              className={`product-tag-option ${
                selectedMainId === main.id ? "product-tag-option--active" : ""
              }`}
              onClick={() => handleSelectMain(main.id)}
            >
              {main.name}
            </button>
          ))}
        </div>
      </div>

      {selectedMainId !== "all" && visibleSubCategories.length > 0 && (
        <div className="product-filter-row product-filter-row--nested">
          <span className="product-filter-row-label">الفئات الفرعية</span>
          <div className="product-tag-options">
            <button
              type="button"
              className={`product-tag-option ${
                filters.categoryId === selectedMainId
                  ? "product-tag-option--active"
                  : ""
              }`}
              onClick={() => handleSelectSub(selectedMainId)}
            >
              الكل
            </button>
            {visibleSubCategories.map((sub) => (
              <button
                type="button"
                key={sub.id}
                className={`product-tag-option ${
                  filters.categoryId === sub.id
                    ? "product-tag-option--active"
                    : ""
                }`}
                onClick={() => handleSelectSub(sub.id)}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {renderRow("نوع المنتج", "pieceType", pieceTypeOptions)}

      {renderRow("حالة المنتج", "status", [
        { value: "published", label: "متاحة" },
        { value: "reserved", label: "محجوزة" },
        { value: "sold", label: "مباعة" },
        { value: "draft", label: "مسودة" },
        { value: "under_review", label: "قيد الفحص" },
        { value: "hidden", label: "مخفي" },
        { value: "awaiting_photos", label: "قيد التصوير" },
      ])}

      {renderRow("الجنس", "gender", genderOptions)}

      {renderRow("الماركة", "brand", brandOptions)}

      {renderRow("المقاس", "size", sizeOptions)}

      {renderRow("الألوان", "color", colorOptions, { colorSwatch: true })}

      {renderRow("حالة القطعة", "condition", conditionOptions)}

      <div className="product-filter-row">
        <span className="product-filter-row-label">نطاق السعر (ل.س)</span>
        <div className="product-price-range">
          <input
            type="number"
            min={0}
            placeholder="من"
            value={filters.priceMin}
            onChange={(e) => onChange("priceMin", e.target.value)}
          />
          <span>—</span>
          <input
            type="number"
            min={0}
            placeholder="إلى"
            value={filters.priceMax}
            onChange={(e) => onChange("priceMax", e.target.value)}
          />
        </div>
      </div>

      <div className="product-filter-row">
        <span className="product-filter-row-label">فلاتر خاصة</span>
        <div className="product-tag-options">
          {specialFilters.map((f) => (
            <button
              type="button"
              key={f.key}
              className={`product-tag-option ${
                filters[f.key] ? "product-tag-option--active" : ""
              }`}
              onClick={() => onChange(f.key, !filters[f.key])}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="product-filters-actions">
        <button
          type="button"
          className="product-filters-reset"
          onClick={onReset}
        >
          إعادة تعيين
        </button>
        <button
          type="button"
          className="product-filters-apply"
          onClick={onApply}
        >
          تطبيق الفلاتر
        </button>
      </div>
    </div>
  );
};

export default ProductFilters;

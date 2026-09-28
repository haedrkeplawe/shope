// user
import { useEffect, useState } from "react";
import { FiX, FiChevronDown } from "react-icons/fi";

/*
  ShopFilterDrawer
  ------------------------------------------------------------------
  درج الفلاتر الكامل لصفحة المتجر - بيترسم ديناميكيًا بالكامل من بيانات
  /api/shop/filters (نفس الفلاتر المتقدمة يلي بيديرها الأدمن بالضبط -
  أي فلتر جديد أو قيمة جديدة يضيفها الأدمن بتنعكس هون تلقائيًا بدون أي
  تعديل كود بالفرونت)

  - حالة "مسودة" (draft) منفصلة عن الفلاتر المطبّقة فعليًا بالرابط -
    التغييرات جوا الدرج ما بتنعكس إلا بعد الضغط "تطبيق الفلاتر"، عشان ما
    نطلق طلب سيرفر لكل ضغطة (نفس فلسفة معظم متاجر التسوق الاحترافية)
  - initialOpenSection: قسم بيتفتح تلقائيًا أول ما الدرج ينفتح لأول مرة
    (جاي من "البراندات" أو "اكتشف المجموعات") - تمريرة عابرة بس، مش فلتر
    حقيقي محفوظ بالرابط
  - "عروض وتخفيضات"/"وصل حديثًا"/"مميزة" مش موجودين هون قصدًا - عندهم
    شرائح سريعة خاصة فيهم بره الدرج (ShopToolbar) تفاديًا لتكرار نفس
    عنصر التحكم بمكانين
*/

const buildDraft = (searchParams, filtersMeta) => {
  const draft = {
    category: searchParams.get("category") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    membersOnly: searchParams.get("membersOnly") === "1",
  };
  (filtersMeta?.filters || []).forEach((f) => {
    const raw = searchParams.get(f.key);
    draft[f.key] = raw ? raw.split(",").filter(Boolean) : [];
  });
  return draft;
};

const toggleValue = (arr, value) =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

const ShopFilterDrawer = ({
  open,
  onClose,
  filtersMeta,
  searchParams,
  onApply,
  initialOpenSection,
}) => {
  const [draft, setDraft] = useState(() =>
    buildDraft(searchParams, filtersMeta),
  );
  const [expandedSections, setExpandedSections] = useState(
    () => new Set([initialOpenSection || "category"]),
  );
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [searchWithin, setSearchWithin] = useState({});

  // كل ما الدرج ينفتح، نصفّر المسودة من آخر فلاتر مطبّقة فعليًا بالرابط
  // (عشان لو المستخدم عدّل وسكّر بدون تطبيق، ترجع الحالة الحقيقية)
  useEffect(() => {
    if (open) setDraft(buildDraft(searchParams, filtersMeta));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !filtersMeta) return null;

  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApply = () => {
    const payload = {
      category: draft.category || null,
      minPrice: draft.minPrice || null,
      maxPrice: draft.maxPrice || null,
      membersOnly: draft.membersOnly ? "1" : null,
    };
    (filtersMeta.filters || []).forEach((f) => {
      payload[f.key] = draft[f.key]?.length ? draft[f.key].join(",") : null;
    });
    onApply(payload);
  };

  const handleClearDraft = () => {
    const cleared = {
      category: "",
      minPrice: "",
      maxPrice: "",
      membersOnly: false,
    };
    (filtersMeta.filters || []).forEach((f) => {
      cleared[f.key] = [];
    });
    setDraft(cleared);
  };

  const renderCheckboxRow = (filterKey, value, label) => (
    <label key={value} className="shop-filter-option">
      <input
        type="checkbox"
        checked={Boolean(draft[filterKey]?.includes(value))}
        onChange={() =>
          setDraft((prev) => ({
            ...prev,
            [filterKey]: toggleValue(prev[filterKey] || [], value),
          }))
        }
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="shop-drawer-overlay" onClick={onClose}>
      <div className="shop-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="shop-drawer-header">
          <h2 className="shop-drawer-title">الفلاتر</h2>
          <button
            type="button"
            className="shop-drawer-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <FiX />
          </button>
        </div>

        <div className="shop-drawer-body">
          {/* -------------------- الفئة -------------------- */}
          {filtersMeta.categories.length > 0 && (
            <div
              className={`shop-drawer-section${
                expandedSections.has("category")
                  ? " shop-drawer-section--open"
                  : ""
              }`}
            >
              <button
                type="button"
                className="shop-drawer-section-header"
                onClick={() => toggleSection("category")}
              >
                <span>الفئة</span>
                <FiChevronDown className="shop-drawer-chevron" />
              </button>

              {expandedSections.has("category") && (
                <div className="shop-drawer-section-body">
                  {filtersMeta.categories.map((cat) => (
                    <div key={cat.id} className="shop-category-group">
                      <label className="shop-filter-option shop-filter-option--main">
                        <input
                          type="radio"
                          name="shop-category"
                          checked={draft.category === cat.id}
                          onChange={() => {
                            setDraft((prev) => ({ ...prev, category: cat.id }));
                            // اختيار القسم الرئيسي بيفتح فئاته الفرعية تلقائيًا
                            // تحته مباشرة، عشان الزبون يقدر يدقّق أكتر لو حاب
                            // (نفس فلسفة النظام: قسم رئيسي فيه فئات فرعية تبعه)
                            if (cat.subCategories.length > 0) {
                              setExpandedCategoryId(cat.id);
                            }
                          }}
                        />
                        <span>{cat.name}</span>

                        {cat.subCategories.length > 0 && (
                          <button
                            type="button"
                            className="shop-category-expand"
                            onClick={(e) => {
                              e.preventDefault();
                              setExpandedCategoryId((prev) =>
                                prev === cat.id ? null : cat.id,
                              );
                            }}
                          >
                            <FiChevronDown
                              className={`shop-drawer-chevron${
                                expandedCategoryId === cat.id
                                  ? " shop-drawer-chevron--open"
                                  : ""
                              }`}
                            />
                          </button>
                        )}
                      </label>

                      {expandedCategoryId === cat.id && (
                        <div className="shop-subcategory-list">
                          {cat.subCategories.map((sub) => (
                            <label key={sub.id} className="shop-filter-option">
                              <input
                                type="radio"
                                name="shop-category"
                                checked={draft.category === sub.id}
                                onChange={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    category: sub.id,
                                  }))
                                }
                              />
                              <span>{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -------------------- نطاق السعر -------------------- */}
          <div
            className={`shop-drawer-section${
              expandedSections.has("price") ? " shop-drawer-section--open" : ""
            }`}
          >
            <button
              type="button"
              className="shop-drawer-section-header"
              onClick={() => toggleSection("price")}
            >
              <span>نطاق السعر</span>
              <FiChevronDown className="shop-drawer-chevron" />
            </button>

            {expandedSections.has("price") && (
              <div className="shop-drawer-section-body">
                <div className="shop-price-inputs">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={`من ${filtersMeta.priceRange.min || 0}`}
                    value={draft.minPrice}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        minPrice: e.target.value,
                      }))
                    }
                    className="shop-price-input"
                  />
                  <span className="shop-price-dash">—</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={`إلى ${filtersMeta.priceRange.max || 0}`}
                    value={draft.maxPrice}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        maxPrice: e.target.value,
                      }))
                    }
                    className="shop-price-input"
                  />
                  <span className="shop-price-currency">ل.س</span>
                </div>
              </div>
            )}
          </div>

          {/* -------------------- باقي الفلاتر المتقدمة (ديناميكي بالكامل) -------------------- */}
          {filtersMeta.filters.map((filterDef) => {
            const isOpen = expandedSections.has(filterDef.key);
            const query = searchWithin[filterDef.key] || "";
            const visibleValues =
              filterDef.searchable && query.trim()
                ? filterDef.values.filter((v) => v.label.includes(query.trim()))
                : filterDef.values;
            const selectedCount = draft[filterDef.key]?.length || 0;

            return (
              <div
                key={filterDef.key}
                className={`shop-drawer-section${
                  isOpen ? " shop-drawer-section--open" : ""
                }`}
              >
                <button
                  type="button"
                  className="shop-drawer-section-header"
                  onClick={() => toggleSection(filterDef.key)}
                >
                  <span>{filterDef.displayName}</span>
                  {selectedCount > 0 && (
                    <span className="shop-drawer-section-count">
                      {selectedCount}
                    </span>
                  )}
                  <FiChevronDown className="shop-drawer-chevron" />
                </button>

                {isOpen && (
                  <div className="shop-drawer-section-body">
                    {filterDef.searchable && filterDef.values.length > 8 && (
                      <input
                        type="text"
                        className="shop-filter-search"
                        placeholder={`ابحث بـ${filterDef.displayName}...`}
                        value={query}
                        onChange={(e) =>
                          setSearchWithin((prev) => ({
                            ...prev,
                            [filterDef.key]: e.target.value,
                          }))
                        }
                      />
                    )}

                    {filterDef.values.length === 0 ? (
                      <p className="shop-filter-empty">
                        ما في قيم مضافة لهاي الفلتر لسه
                      </p>
                    ) : filterDef.key === "color" ? (
                      <div className="shop-color-grid">
                        {visibleValues.map((v) => (
                          <label key={v.value} className="shop-color-option">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.color?.includes(v.value))}
                              onChange={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  color: toggleValue(prev.color || [], v.value),
                                }))
                              }
                            />
                            <span
                              className="shop-color-swatch"
                              style={{ backgroundColor: v.colorHex || "#ccc" }}
                            />
                            <span className="shop-color-label">{v.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : filterDef.key === "size" ? (
                      <div className="shop-size-grid">
                        {visibleValues.map((v) => {
                          const checked = Boolean(
                            draft.size?.includes(v.value),
                          );
                          return (
                            <button
                              key={v.value}
                              type="button"
                              className={`shop-size-chip${
                                checked ? " shop-size-chip--active" : ""
                              }`}
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  size: toggleValue(prev.size || [], v.value),
                                }))
                              }
                            >
                              {v.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="shop-filter-list">
                        {visibleValues.map((v) =>
                          renderCheckboxRow(filterDef.key, v.value, v.label),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* -------------------- خيارات إضافية -------------------- */}
          {filtersMeta.toggles.membersOnly && (
            <div className="shop-drawer-section shop-drawer-section--open">
              <label className="shop-filter-option shop-filter-option--switch">
                <input
                  type="checkbox"
                  checked={draft.membersOnly}
                  onChange={() =>
                    setDraft((prev) => ({
                      ...prev,
                      membersOnly: !prev.membersOnly,
                    }))
                  }
                />
                <span>قطع حصرية للأعضاء فقط</span>
              </label>
            </div>
          )}
        </div>

        <div className="shop-drawer-footer">
          <button
            type="button"
            className="shop-drawer-clear"
            onClick={handleClearDraft}
          >
            مسح الكل
          </button>
          <button
            type="button"
            className="shop-drawer-apply"
            onClick={handleApply}
          >
            تطبيق الفلاتر
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopFilterDrawer;

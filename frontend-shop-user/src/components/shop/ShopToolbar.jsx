// user
import { useState } from "react";
import { FiFilter, FiSearch, FiChevronDown, FiCheck } from "react-icons/fi";

/*
  ShopToolbar
  ------------------------------------------------------------------
  شريط أدوات صفحة المتجر: زر فتح درج الفلاتر الكامل + ترتيب + بحث، وتحته
  صفّين شرائح (Chips) سريعة:
  1) صف الفئات (ديناميكي من /api/shop/filters) - فلتر فوري بدون درج
  2) صف خيارات شائعة ثابتة (وصل حديثًا / مميزة / عروض) - فلتر فوري كمان

  الشرائح هون مقصودة كطريق مختصر لأكتر الفلاتر استخدامًا، والدرج الكامل
  (زر الفلتر) بيغطي الباقي (الجنس، اللون، المقاس، الماركة، نطاق السعر...)
*/

const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "السعر: من الأقل" },
  { value: "price_desc", label: "السعر: من الأعلى" },
  { value: "popular", label: "الأكثر رواجًا" },
  { value: "top_rated", label: "الأعلى تقييمًا" },
];

const ShopToolbar = ({
  searchInput,
  onSearchChange,
  sort,
  onSortChange,
  categories,
  activeCategory,
  onCategoryChipClick,
  quickToggles,
  onQuickToggle,
  onOpenDrawer,
  activeFilterCount,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label || "الأحدث";

  return (
    <div className="shop-toolbar">
      <div className="shop-toolbar-row">
        <button
          type="button"
          className="shop-filter-btn"
          onClick={onOpenDrawer}
          aria-label="الفلاتر"
        >
          <FiFilter />
          {activeFilterCount > 0 && (
            <span className="shop-filter-btn-badge">{activeFilterCount}</span>
          )}
        </button>

        <div className="shop-sort">
          <button
            type="button"
            className="shop-sort-btn"
            onClick={() => setSortOpen((prev) => !prev)}
          >
            <FiChevronDown
              className={`shop-sort-chevron${
                sortOpen ? " shop-sort-chevron--open" : ""
              }`}
            />
            {currentSortLabel}
          </button>

          {sortOpen && (
            <>
              <div
                className="shop-sort-backdrop"
                onClick={() => setSortOpen(false)}
              />
              <div className="shop-sort-menu">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`shop-sort-option${
                      option.value === sort ? " shop-sort-option--active" : ""
                    }`}
                    onClick={() => {
                      onSortChange(option.value);
                      setSortOpen(false);
                    }}
                  >
                    {option.value === sort && (
                      <FiCheck className="shop-sort-check" />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="shop-search">
          <FiSearch className="shop-search-icon" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في المتجر..."
            className="shop-search-input"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="shop-chips-row">
          <button
            type="button"
            className={`shop-chip${
              !activeCategory ? " shop-chip--active" : ""
            }`}
            onClick={() => onCategoryChipClick(null)}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`shop-chip${
                activeCategory === cat.id ? " shop-chip--active" : ""
              }`}
              onClick={() => onCategoryChipClick(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="shop-chips-row">
        <button
          type="button"
          className={`shop-chip shop-chip--outline${
            quickToggles.isNew ? " shop-chip--active" : ""
          }`}
          onClick={() => onQuickToggle("isNew")}
        >
          وصل حديثًا
        </button>
        <button
          type="button"
          className={`shop-chip shop-chip--outline${
            quickToggles.featured ? " shop-chip--active" : ""
          }`}
          onClick={() => onQuickToggle("featured")}
        >
          مميزة
        </button>
        <button
          type="button"
          className={`shop-chip shop-chip--outline${
            quickToggles.onOffer ? " shop-chip--active" : ""
          }`}
          onClick={() => onQuickToggle("onOffer")}
        >
          عروض وتخفيضات
        </button>
      </div>
    </div>
  );
};

export default ShopToolbar;

// user
import { useState } from "react";
import {
  FiFilter,
  FiSearch,
  FiChevronDown,
  FiCheck,
  FiX,
  FiClock,
} from "react-icons/fi";

/*
  ShopToolbar
  ------------------------------------------------------------------
  شريط أدوات صفحة المتجر: زر فتح درج الفلاتر الكامل + ترتيب + بحث، وتحته
  صفّين شرائح (Chips) سريعة:
  1) صف الفئات (ديناميكي من /api/shop/filters) - فلتر فوري بدون درج
  2) صف خيارات شائعة ثابتة (وصل حديثًا / مميزة / عروض) - فلتر فوري كمان

  الشرائح هون مقصودة كطريق مختصر لأكتر الفلاتر استخدامًا، والدرج الكامل
  (زر الفلتر) بيغطي الباقي (الجنس، اللون، المقاس، الماركة، نطاق السعر...)

  خانة البحث:
  - Enter (أو زر "بحث" بكيبورد الموبايل) بيبحث فورًا بلا انتظار التأخير
    وبيسكّر الكيبورد - شوف onSearchSubmit بـ Shop.jsx
  - زر ✕ لمسح البحث بضغطة وحدة
  - "عمليات البحث الأخيرة": قائمة منسدلة بتظهر لما الخانة فاضية والمؤشر
    فيها - onMouseDown مع preventDefault على القائمة عشان الضغط عليها ما
    يسحب التركيز من الخانة (وإلا blur بيسكّر القائمة قبل ما يوصل الضغط)
  - "الأكثر صلة" بقائمة الترتيب بتظهر بس وقت يكون في بحث فعّال (hasSearch)
*/

const RELEVANCE_OPTION = { value: "relevance", label: "الأكثر صلة" };

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
  onSearchSubmit,
  onSearchClear,
  onSearchBlur,
  searchInputRef,
  hasSearch,
  recentSearches,
  onPickRecent,
  onRemoveRecent,
  onClearRecent,
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
  const [searchFocused, setSearchFocused] = useState(false);

  const sortOptions = hasSearch
    ? [RELEVANCE_OPTION, ...SORT_OPTIONS]
    : SORT_OPTIONS;
  const currentSortLabel =
    sortOptions.find((o) => o.value === sort)?.label || "الأحدث";

  const showRecent =
    searchFocused && !searchInput.trim() && recentSearches.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit();
    searchInputRef.current?.blur();
  };

  const handleClear = () => {
    onSearchClear();
    searchInputRef.current?.focus();
  };

  const handlePickRecent = (query) => {
    onPickRecent(query);
    searchInputRef.current?.blur();
  };

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
                {sortOptions.map((option) => (
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

        <form className="shop-search" role="search" onSubmit={handleSubmit}>
          <FiSearch className="shop-search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              setSearchFocused(false);
              onSearchBlur();
            }}
            placeholder="ابحث عن قطعة، ماركة، لون..."
            className="shop-search-input"
            aria-label="ابحث في المتجر"
            maxLength={100}
            autoComplete="off"
          />
          {searchInput && (
            <button
              type="button"
              className="shop-search-clear"
              onClick={handleClear}
              aria-label="مسح البحث"
            >
              <FiX />
            </button>
          )}

          {showRecent && (
            <div
              className="shop-recent"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="shop-recent-header">
                <span className="shop-recent-title">عمليات البحث الأخيرة</span>
                <button
                  type="button"
                  className="shop-recent-clear-all"
                  onClick={onClearRecent}
                >
                  مسح الكل
                </button>
              </div>
              <ul className="shop-recent-list">
                {recentSearches.map((query) => (
                  <li key={query} className="shop-recent-item">
                    <button
                      type="button"
                      className="shop-recent-pick"
                      onClick={() => handlePickRecent(query)}
                    >
                      <FiClock className="shop-recent-icon" />
                      <span className="shop-recent-text">{query}</span>
                    </button>
                    <button
                      type="button"
                      className="shop-recent-remove"
                      onClick={() => onRemoveRecent(query)}
                      aria-label={`حذف "${query}" من عمليات البحث الأخيرة`}
                    >
                      <FiX />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
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

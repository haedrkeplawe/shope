// user
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiPackage, FiSearch } from "react-icons/fi";
import { API_URL } from "../config/api";
import ProductCard from "../components/ProductCard";
import ShopToolbar from "../components/shop/ShopToolbar";
import ActiveFilterChips from "../components/shop/ActiveFilterChips";
import ShopFilterDrawer from "../components/shop/ShopFilterDrawer";
import { getShopListState, saveShopListState } from "../utils/shopListCache";
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from "../utils/recentSearches";

/*
  Shop (صفحة المتجر الكاملة)
  ------------------------------------------------------------------
  الصفحة الموحّدة لتصفح كل منتجات المتجر - نفس الصفحة بالضبط بترتاد
  إلها كل روابط الموقع (المتجر، البراندات، جديدنا، العروض من القائمة،
  "تسوق الآن"/"اكتشف المجموعات" من الـHero، و"عرض الكل" بأي سلايدر
  بالرئيسية) - الفرق الوحيد بينهم هو *كيف* توصل، مش الصفحة نفسها:

  - preset="none"  → المتجر / البراندات / "تسوق الآن": بدون أي فلتر بيانات
  - preset="new"   → "جديدنا": فلتر "وصل حديثًا" مفعّل تلقائيًا
  - preset="offers"→ "العروض": فلتر "عروض وتخفيضات" مفعّل تلقائيًا

  - "البراندات" و"اكتشف المجموعات" ما إلهم فلتر بيانات محدد (مفيش
    ماركة/فئة واحدة نفترضها) - بس بيفتحوا درج الفلاتر تلقائيًا على قسم
    الماركة/الفئة، عن طريق location.state.openSection (تمريرة عابرة
    بس، مش جزء من الرابط لأنها مش فلتر حقيقي قابل للمشاركة)

  مصدر الحقيقة الوحيد لكل فلاتر البيانات هو الرابط نفسه (searchParams) -
  عشان الرابط يضل قابل للمشاركة ويشتغل صح مع زر الرجوع بالمتصفح، بغض
  النظر عن نقطة الدخول

  ⚠️ البحث كله بالموقع هون (ما في صفحة بحث منفصلة):
  - أيقونة البحث بالهيدر/القائمة بتوصل لهون مع location.state.focusSearch
    → منركّز المؤشر بخانة البحث (شوف getSearchLinkProps بـ siteNavItems.js)
  - searchInput (نص الخانة) ≠ ?search بالرابط (البحث المعتمد فعليًا):
    الكتابة بتتعتمد بالرابط بعد تأخير 450ms، أو فورًا مع Enter
  - lastCommittedRef: آخر قيمة اعتمدناها *إحنا* بالرابط - بتفرّق بين
    تحديث الرابط من الكتابة نفسها (ما منلمس الخانة) وبين تغيير جاي من
    برّا (حذف شريحة البحث، زر رجوع المتصفح...) → وقتها منزامن الخانة
  - وقت البحث الترتيب الافتراضي "الأكثر صلة" (relevance) بدل "الأحدث"
  - لو ما في نتائج، السيرفر بيرجّع suggestions (منتجات قريبة) منعرضها
    تحت رسالة "لم نعثر على نتائج"
*/

const DEFAULT_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 450;

const emptyFiltersMeta = {
  categories: [],
  priceRange: { min: 0, max: 0 },
  filters: [],
  toggles: { onOffer: false, membersOnly: false },
};

const Shop = ({ preset = "none" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // تمريرة عابرة (مش جزء من الرابط) - بتتلقط مرة وحدة بس وقت أول تحميل
  const [initialOpenSection] = useState(
    () => location.state?.openSection || null,
  );

  // لو المستخدم راجع لهون (زر رجوع المتصفح من صفحة منتج مثلاً) وعندنا
  // نسخة محفوظة بالكاش مطابقة لنفس الفلاتر الحالية بالضبط، منعبّي الحالة
  // منها مباشرة من أول Render (بدل ما نبلّش فاضي ونجيب من جديد) - هيك
  // القائمة بترجع كاملة فورًا بلا أي وميض تحميل
  const [filtersMeta, setFiltersMeta] = useState(null);
  const [products, setProducts] = useState(
    () => getShopListState(searchParams.toString())?.products || [],
  );
  const [suggestions, setSuggestions] = useState(
    () => getShopListState(searchParams.toString())?.suggestions || [],
  );
  const [pagination, setPagination] = useState(
    () =>
      getShopListState(searchParams.toString())?.pagination || {
        page: 1,
        limit: DEFAULT_LIMIT,
        total: 0,
        totalPages: 0,
      },
  );
  const [loadingProducts, setLoadingProducts] = useState(
    () => !getShopListState(searchParams.toString()),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialOpenSection));
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") || "",
  );
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);

  const seededPreset = useRef(false);
  const currentPageRef = useRef(
    getShopListState(searchParams.toString())?.page || 1,
  );
  // نسخة "حيّة" من المنتجات/الترقيم بمرجع (Ref) - لازمة عشان نقدر نحفظ
  // آخر حالة بالكاش لحظة مغادرة الصفحة (Cleanup)، لأنه الـ Closure
  // القديم وقت ما الـ Effect اشتغل أول مرة ما بيشوف تحديثات الـ State
  // الجايي بعده (تحميل صفحات إضافية عبر "تحميل المزيد" مثلاً)
  const productsRef = useRef(products);
  const paginationRef = useRef(pagination);
  const suggestionsRef = useRef(suggestions);
  // true بس أول Render لو في كاش جاهز مطابق لنفس الفلاتر الحالية - بيمنع
  // أول تشغيل لـ Effect جلب المنتجات من إعادة الجلب فوق الحالة يلي
  // عبّيناها من الكاش فوق أصلاً
  const skipInitialFetchRef = useRef(
    Boolean(getShopListState(searchParams.toString())),
  );
  // طلب الجلب الجاري - منلغيه لو بلّش طلب أحدث (كتابة سريعة بالبحث أو
  // تغيير فلاتر ورا بعض) عشان ما ترجع نتيجة قديمة وتكتب فوق الأحدث
  const abortRef = useRef(null);

  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const lastCommittedRef = useRef(searchParams.get("search") || "");

  const urlSearch = searchParams.get("search") || "";
  const hasSearch = Boolean(urlSearch);
  const defaultSort = hasSearch ? "relevance" : "newest";
  const currentSort = searchParams.get("sort") || defaultSort;

  /* -------------------- بذر الفلتر الافتراضي حسب نقطة الدخول -------------------- */
  useEffect(() => {
    if (seededPreset.current) return;
    seededPreset.current = true;

    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (preset === "new" && !params.has("isNew")) {
      params.set("isNew", "1");
      changed = true;
    }
    if (preset === "offers" && !params.has("onOffer")) {
      params.set("onOffer", "1");
      changed = true;
    }

    if (changed) setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- تركيز خانة البحث (جاي من أيقونة البحث) -------------------- */
  // مربوط بـ location.key عشان يشتغل كمان لو الزبون أصلاً بصفحة المتجر
  // وضغط أيقونة البحث (نفس الصفحة، تنقّل جديد). بعد التركيز منشيل
  // focusSearch من الـ state عشان Refresh الصفحة ما يعيد التركيز
  useEffect(() => {
    if (!location.state?.focusSearch) return;

    window.scrollTo(0, 0);
    searchInputRef.current?.focus({ preventScroll: true });

    const { focusSearch, ...restState } = location.state;
    navigate(
      { pathname: location.pathname, search: location.search },
      {
        replace: true,
        state: Object.keys(restState).length > 0 ? restState : null,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  /* -------------------- جلب بيانات الفلاتر (مرة وحدة فقط) -------------------- */
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/filters`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setFiltersMeta(data);
        else setFiltersMeta(emptyFiltersMeta);
      } catch (error) {
        setFiltersMeta(emptyFiltersMeta);
      }
    };

    fetchFilters();
  }, []);

  /* -------------------- جلب المنتجات -------------------- */
  const fetchProducts = useCallback(
    async (pageToLoad, append) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) setLoadingMore(true);
      else setLoadingProducts(true);

      try {
        const params = new URLSearchParams(searchParams);
        params.set("page", String(pageToLoad));
        params.set("limit", String(DEFAULT_LIMIT));

        const res = await fetch(
          `${API_URL}/shop/products?${params.toString()}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        const data = await res.json();

        if (res.ok) {
          const nextProducts = append
            ? [...productsRef.current, ...(data.products || [])]
            : data.products || [];
          const nextPagination = data.pagination || {
            page: 1,
            limit: DEFAULT_LIMIT,
            total: 0,
            totalPages: 0,
          };
          productsRef.current = nextProducts;
          paginationRef.current = nextPagination;
          setProducts(nextProducts);
          setPagination(nextPagination);
          currentPageRef.current = pageToLoad;

          if (!append) {
            const nextSuggestions = data.suggestions || [];
            suggestionsRef.current = nextSuggestions;
            setSuggestions(nextSuggestions);
          }
        } else if (!append) {
          productsRef.current = [];
          suggestionsRef.current = [];
          setProducts([]);
          setSuggestions([]);
        }
      } catch (error) {
        // طلب ملغي لأنه بلّش طلب أحدث - الطلب الأحدث هو المسؤول عن الحالة
        if (error.name === "AbortError") return;
        if (!append) {
          productsRef.current = [];
          suggestionsRef.current = [];
          setProducts([]);
          setSuggestions([]);
        }
      } finally {
        if (abortRef.current === controller) {
          setLoadingProducts(false);
          setLoadingMore(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()],
  );

  // أي تغيير حقيقي بفلاتر الرابط (فلتر، ترتيب، بحث...) بيرجّعنا لأول صفحة -
  // إلا لو أول تحميل وفي كاش جاهز مطابق لنفس الفلاتر (رجوع من صفحة منتج
  // مثلاً)، وقتها منتفادى الجلب فوق الحالة يلي عبّيناها من الكاش أصلاً.
  // لحظة مغادرة الصفحة (تنظيف الـ Effect - فتح منتج، أو تغيير الفلاتر)
  // منحفظ آخر حالة بالكاش عشان ترجع جاهزة لو المستخدم رجع بزر رجوع المتصفح.
  // ⚠️ موضع السكرول نفسه مش مسؤوليتنا هون - ScrollManager بيرجّعه (القائمة
  // بترجع من الكاش بطولها الكامل فورًا، فالاسترجاع بيصير بدون انتظار)
  useEffect(() => {
    const key = searchParams.toString();

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
    } else {
      fetchProducts(1, false);
    }

    return () => {
      saveShopListState(key, {
        products: productsRef.current,
        pagination: paginationRef.current,
        suggestions: suggestionsRef.current,
        page: currentPageRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // إلغاء أي طلب جاري لحظة مغادرة الصفحة نهائيًا
  useEffect(() => () => abortRef.current?.abort(), []);

  /* -------------------- البحث -------------------- */
  // اعتماد نص البحث بالرابط (فاضي = شيل البحث). saveRecent بتضيفه
  // لـ"عمليات البحث الأخيرة" - بس للبحث المقصود (Enter/اختيار/ترك الخانة)،
  // مش لكل حرف بينكتب أثناء التأخير.
  // ⚠️ التحديث بصيغة الدالة (prev) عن قصد: الاعتماد ممكن يصير من مؤقّت
  // التأخير بعد ما الزبون غيّر فلتر تاني بالنص - لو بنينا على
  // searchParams القديمة من وقت الكتابة كان رح نمسح الفلتر الجديد
  const commitSearch = (value, { saveRecent = false } = {}) => {
    clearTimeout(searchTimerRef.current);
    const term = value.trim();
    lastCommittedRef.current = term;

    setSearchParams(
      (prev) => {
        if ((prev.get("search") || "") === term) return prev;
        const params = new URLSearchParams(prev);
        if (term) params.set("search", term);
        else params.delete("search");
        return params;
      },
      { replace: true },
    );

    if (saveRecent && term) setRecentSearches(addRecentSearch(term));
  };

  // الكتابة بالخانة → اعتماد بالرابط بعد تأخير بسيط
  useEffect(() => {
    if (searchInput.trim() === urlSearch) return;

    searchTimerRef.current = setTimeout(
      () => commitSearch(searchInput),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(searchTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // تغيير البحث بالرابط من برّا الخانة (حذف شريحة "بحث: ..."، زر رجوع
  // المتصفح...) → منزامن نص الخانة معه
  useEffect(() => {
    if (urlSearch === lastCommittedRef.current) return;
    lastCommittedRef.current = urlSearch;
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const handleSearchSubmit = () =>
    commitSearch(searchInput, { saveRecent: true });

  const handleSearchClear = () => {
    setSearchInput("");
    commitSearch("");
  };

  // ترك الخانة بعد بحث معتمد (مثلاً ضغط على منتج من النتائج) = بحث مقصود
  const handleSearchBlur = () => {
    const term = searchInput.trim();
    if (term && term === urlSearch) {
      setRecentSearches(addRecentSearch(term));
    }
  };

  const handlePickRecent = (query) => {
    setSearchInput(query);
    commitSearch(query, { saveRecent: true });
  };

  const handleRemoveRecent = (query) =>
    setRecentSearches(removeRecentSearch(query));

  const handleClearRecent = () => setRecentSearches(clearRecentSearches());

  const handleLoadMore = () => {
    if (loadingMore || currentPageRef.current >= pagination.totalPages) return;
    fetchProducts(currentPageRef.current + 1, true);
  };

  // تحديث دفعة مفاتيح بالرابط مرة وحدة (عشان حذف أكتر من مفتاح سوا -
  // زي نطاق السعر - ما يصير بخطوتين متضاربتين)
  const updateParams = (updates) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  const updateParam = (key, value) => updateParams({ [key]: value });

  const handleCategoryChipClick = (categoryId) =>
    updateParam("category", categoryId || null);

  const handleQuickToggle = (key) => {
    const isActive = searchParams.get(key) === "1";
    updateParam(key, isActive ? null : "1");
  };

  // الترتيب الافتراضي (الأكثر صلة وقت البحث، الأحدث غير هيك) ما بينكتب
  // بالرابط - بس أي اختيار تاني صريح
  const handleSortChange = (sort) =>
    updateParam("sort", sort === defaultSort ? null : sort);

  const handleApplyDrawer = (nextParamsObject) => {
    updateParams(nextParamsObject);
    setDrawerOpen(false);
  };

  const handleClearAll = () => {
    clearTimeout(searchTimerRef.current);
    lastCommittedRef.current = "";
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [...searchParams.keys()].filter(
    (k) => !["sort", "page", "limit"].includes(k),
  ).length;

  const meta = filtersMeta || emptyFiltersMeta;

  const renderEmptyState = () => {
    if (!hasSearch) {
      return (
        <div className="shop-empty">
          <FiPackage className="shop-empty-icon" />
          <h2 className="shop-empty-title">لم نعثر على أي قطع مطابقة</h2>
          <p className="shop-empty-text">
            جرّب تغيير الفلاتر أو امسحها كلها وابدأ من جديد
          </p>
          <button
            type="button"
            className="shop-empty-btn"
            onClick={handleClearAll}
          >
            مسح كل الفلاتر
          </button>
        </div>
      );
    }

    // في فلاتر تانية مفعّلة غير البحث نفسه
    const hasOtherFilters = activeFilterCount > 1;

    return (
      <>
        <div className="shop-empty">
          <FiSearch className="shop-empty-icon" />
          <h2 className="shop-empty-title">
            لم نعثر على نتائج لـ«{urlSearch}»
          </h2>
          <ul className="shop-empty-tips">
            <li>تأكد من كتابة الكلمة بشكل صحيح</li>
            <li>جرّب كلمة أعمّ أو عدد كلمات أقل</li>
            {hasOtherFilters && <li>جرّب مسح الفلاتر المفعّلة مع البحث</li>}
          </ul>
          <div className="shop-empty-actions">
            <button
              type="button"
              className="shop-empty-btn"
              onClick={handleSearchClear}
            >
              مسح البحث
            </button>
            {hasOtherFilters && (
              <button
                type="button"
                className="shop-empty-btn shop-empty-btn--outline"
                onClick={handleClearAll}
              >
                مسح كل الفلاتر
              </button>
            )}
          </div>
        </div>

        {suggestions.length > 0 && (
          <section className="shop-suggestions">
            <h3 className="shop-suggestions-title">قد يعجبك أيضًا</h3>
            <div className="shop-grid">
              {suggestions.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </>
    );
  };

  return (
    <div className="shop-page">
      <div className="shop-page-header">
        {hasSearch ? (
          <h1 className="shop-page-title shop-page-title--search">
            نتائج البحث عن{" "}
            <span className="shop-page-query">«{urlSearch}»</span>
          </h1>
        ) : (
          <h1 className="shop-page-title">المتجر</h1>
        )}
        {!loadingProducts && pagination.total > 0 && (
          <span className="shop-page-count">{pagination.total} قطعة</span>
        )}
      </div>

      <ShopToolbar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        onSearchBlur={handleSearchBlur}
        searchInputRef={searchInputRef}
        hasSearch={hasSearch}
        recentSearches={recentSearches}
        onPickRecent={handlePickRecent}
        onRemoveRecent={handleRemoveRecent}
        onClearRecent={handleClearRecent}
        sort={currentSort}
        onSortChange={handleSortChange}
        categories={meta.categories}
        activeCategory={searchParams.get("category") || ""}
        onCategoryChipClick={handleCategoryChipClick}
        quickToggles={{
          isNew: searchParams.get("isNew") === "1",
          featured: searchParams.get("featured") === "1",
          onOffer: searchParams.get("onOffer") === "1",
        }}
        onQuickToggle={handleQuickToggle}
        onOpenDrawer={() => setDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      <ActiveFilterChips
        searchParams={searchParams}
        filtersMeta={filtersMeta}
        onUpdateParam={updateParam}
        onUpdateParams={updateParams}
        onClearAll={handleClearAll}
      />

      {loadingProducts ? (
        <div className="shop-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shop-card-skeleton" />
          ))}
        </div>
      ) : products.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <div className="shop-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {currentPageRef.current < pagination.totalPages && (
            <button
              type="button"
              className="shop-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "جاري التحميل..." : "تحميل المزيد"}
            </button>
          )}
        </>
      )}

      <ShopFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filtersMeta={filtersMeta}
        searchParams={searchParams}
        onApply={handleApplyDrawer}
        initialOpenSection={initialOpenSection}
      />
    </div>
  );
};

export default Shop;

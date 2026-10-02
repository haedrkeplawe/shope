// user
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { FiPackage } from "react-icons/fi";
import { API_URL } from "../config/api";
import ProductCard from "../components/ProductCard";
import ShopToolbar from "../components/shop/ShopToolbar";
import ActiveFilterChips from "../components/shop/ActiveFilterChips";
import ShopFilterDrawer from "../components/shop/ShopFilterDrawer";
import { getShopListState, saveShopListState } from "../utils/shopListCache";

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
*/

const DEFAULT_LIMIT = 12;

const emptyFiltersMeta = {
  categories: [],
  priceRange: { min: 0, max: 0 },
  filters: [],
  toggles: { onOffer: false, membersOnly: false },
};

const Shop = ({ preset = "none" }) => {
  const location = useLocation();
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
  // true بس أول Render لو في كاش جاهز مطابق لنفس الفلاتر الحالية - بيمنع
  // أول تشغيل لـ Effect جلب المنتجات من إعادة الجلب فوق الحالة يلي
  // عبّيناها من الكاش فوق أصلاً
  const skipInitialFetchRef = useRef(
    Boolean(getShopListState(searchParams.toString())),
  );

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
        } else if (!append) {
          productsRef.current = [];
          setProducts([]);
        }
      } catch (error) {
        if (!append) {
          productsRef.current = [];
          setProducts([]);
        }
      } finally {
        setLoadingProducts(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()],
  );

  // أي تغيير حقيقي بفلاتر الرابط (فلتر، ترتيب، بحث...) بيرجّعنا لأول صفحة -
  // إلا لو أول تحميل وفي كاش جاهز مطابق لنفس الفلاتر (رجوع من صفحة منتج
  // مثلاً)، وقتها منتفادى الجلب فوق الحالة يلي عبّيناها من الكاش أصلاً
  // ومنستعيد موضع السكرول بعد ما المحتوى يترسم بارتفاعه الصح. لحظة
  // مغادرة الصفحة (تنظيف الـ Effect - فتح منتج، أو تغيير الفلاتر) منحفظ
  // آخر حالة بالكاش عشان ترجع جاهزة لو المستخدم رجع بزر رجوع المتصفح
  useEffect(() => {
    const key = searchParams.toString();

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      const cached = getShopListState(key);
      if (cached?.scrollY) {
        requestAnimationFrame(() => window.scrollTo(0, cached.scrollY));
      }
    } else {
      fetchProducts(1, false);
    }

    return () => {
      saveShopListState(key, {
        products: productsRef.current,
        pagination: paginationRef.current,
        page: currentPageRef.current,
        scrollY: window.scrollY,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  /* -------------------- البحث (بتأخير بسيط قبل تحديث الرابط) -------------------- */
  useEffect(() => {
    const committed = searchParams.get("search") || "";
    if (searchInput === committed) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchInput.trim()) params.set("search", searchInput.trim());
      else params.delete("search");
      setSearchParams(params, { replace: true });
    }, 450);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

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

  const handleSortChange = (sort) =>
    updateParam("sort", sort === "newest" ? null : sort);

  const handleApplyDrawer = (nextParamsObject) => {
    updateParams(nextParamsObject);
    setDrawerOpen(false);
  };

  const handleClearAll = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [...searchParams.keys()].filter(
    (k) => !["sort", "page", "limit"].includes(k),
  ).length;

  const meta = filtersMeta || emptyFiltersMeta;

  return (
    <div className="shop-page">
      <div className="shop-page-header">
        <h1 className="shop-page-title">المتجر</h1>
        {pagination.total > 0 && (
          <span className="shop-page-count">{pagination.total} قطعة</span>
        )}
      </div>

      <ShopToolbar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        sort={searchParams.get("sort") || "newest"}
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
        <div className="shop-empty">
          <FiPackage className="shop-empty-icon" />
          <h2 className="shop-empty-title">ما لقينا أي قطع مطابقة</h2>
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

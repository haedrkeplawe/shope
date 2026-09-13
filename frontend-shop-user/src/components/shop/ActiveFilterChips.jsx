// user
import { FiX } from "react-icons/fi";

/*
  ActiveFilterChips
  ------------------------------------------------------------------
  شريط "شرائح" الفلاتر الفعالة حاليًا فوق شبكة المنتجات - كل فلتر مطبّق
  (مهما كان مصدره: الدرج، الشرائح السريعة، أو حتى رابط جاي من الرئيسية
  زي /shop?category=... أو /shop?isNew=1) بيظهر هون كشريحة قابلة للإزالة
  بضغطة وحدة، بالإضافة لزر "مسح الكل" لو فيه أكتر من شريحة وحدة
  - محتاجة filtersMeta بس عشان تترجم القيمة الداخلية (value) لاسم عرض
    حقيقي (label) - نفس فلسفة resolveFilterLabels بالباك إند تمامًا
*/

const TOGGLE_LABELS = {
  isNew: "وصل حديثًا",
  featured: "مميزة",
  onOffer: "عروض وتخفيضات",
  membersOnly: "للأعضاء فقط",
};

const findCategoryName = (categories, id) => {
  for (const cat of categories) {
    if (cat.id === id) return cat.name;
    const sub = cat.subCategories?.find((s) => s.id === id);
    if (sub) return sub.name;
  }
  return null;
};

const ActiveFilterChips = ({
  searchParams,
  filtersMeta,
  onUpdateParam,
  onUpdateParams,
  onClearAll,
}) => {
  if (!filtersMeta) return null;

  const chips = [];

  const categoryId = searchParams.get("category");
  if (categoryId) {
    chips.push({
      id: "category",
      label:
        findCategoryName(filtersMeta.categories, categoryId) || "فئة محددة",
      onRemove: () => onUpdateParam("category", null),
    });
  }

  filtersMeta.filters.forEach((filterDef) => {
    const raw = searchParams.get(filterDef.key);
    if (!raw) return;

    const selected = raw.split(",").filter(Boolean);
    selected.forEach((value) => {
      const meta = filterDef.values.find((v) => v.value === value);
      chips.push({
        id: `${filterDef.key}:${value}`,
        label: meta?.label || value,
        onRemove: () => {
          const remaining = selected.filter((v) => v !== value);
          onUpdateParam(
            filterDef.key,
            remaining.length ? remaining.join(",") : null,
          );
        },
      });
    });
  });

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  if (minPrice || maxPrice) {
    chips.push({
      id: "price",
      label: `السعر: ${minPrice || "0"} - ${maxPrice || "∞"} ل.س`,
      onRemove: () => onUpdateParams({ minPrice: null, maxPrice: null }),
    });
  }

  Object.keys(TOGGLE_LABELS).forEach((key) => {
    if (searchParams.get(key) === "1") {
      chips.push({
        id: key,
        label: TOGGLE_LABELS[key],
        onRemove: () => onUpdateParam(key, null),
      });
    }
  });

  const search = searchParams.get("search");
  if (search) {
    chips.push({
      id: "search",
      label: `بحث: ${search}`,
      onRemove: () => onUpdateParam("search", null),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="shop-active-filters">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="shop-filter-chip"
          onClick={chip.onRemove}
        >
          {chip.label}
          <FiX />
        </button>
      ))}

      {chips.length > 1 && (
        <button type="button" className="shop-clear-all" onClick={onClearAll}>
          مسح الكل
        </button>
      )}
    </div>
  );
};

export default ActiveFilterChips;

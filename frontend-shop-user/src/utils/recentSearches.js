// user
/*
  utils/recentSearches.js
  ------------------------------------------------------------------
  "عمليات البحث الأخيرة" بخانة البحث بصفحة المتجر - محلية بالكامل
  بـ localStorage المتصفح (خاصة بالجهاز، ما إلها علاقة بحساب الزبون)

  - الأحدث أول، بحد أقصى MAX_ITEMS
  - التكرار بيتحسب بدون فرق أحرف كبيرة/صغيرة - البحث المكرر بيطلع لفوق
    بدل ما يتكرر بالقائمة
  - كل قراءة/كتابة ملفوفة بـ try/catch - لو التخزين ممنوع (تصفح خفي مثلاً)
    الميزة ببساطة بتختفي من غير ما تكسر الصفحة
*/

const STORAGE_KEY = "september_recent_searches";
const MAX_ITEMS = 8;
const MIN_LENGTH = 2;

export const getRecentSearches = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((q) => typeof q === "string")
      : [];
  } catch (error) {
    return [];
  }
};

const save = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    // التخزين ممنوع - منتجاهل بصمت
  }
  return list;
};

// بترجع القائمة الجديدة بعد الإضافة (عشان الـ state يتحدّث فورًا)
export const addRecentSearch = (query) => {
  const term = String(query || "").trim();
  const current = getRecentSearches();
  if (term.length < MIN_LENGTH) return current;

  const next = [
    term,
    ...current.filter((q) => q.toLowerCase() !== term.toLowerCase()),
  ].slice(0, MAX_ITEMS);
  return save(next);
};

export const removeRecentSearch = (query) =>
  save(getRecentSearches().filter((q) => q !== query));

export const clearRecentSearches = () => save([]);

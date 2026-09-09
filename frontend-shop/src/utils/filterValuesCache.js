import { API_URL } from "../config/api";

/*
  filterValuesCache
  - كاش بسيط بالذاكرة لقيم الفلاتر المتقدمة (النشطة بس)
  - بيمنع تكرار نفس الطلب لو أكتر من مكوّن محتاج نفس الفلتر بنفس الوقت
    (مثال: ProductCard بيتكرر لعشرات المنتجات، كل واحد محتاج خريطة ألوان)
  - clearFilterValuesCache بتتستخدم لو حبينا نجبر إعادة الجلب بعد تعديل قيم
    الفلتر من صفحة "إدارة الفلاتر المتقدمة"
*/

const cache = {};
const inflight = {};

export const fetchFilterValues = async (key) => {
  if (!key) return [];
  if (cache[key]) return cache[key];
  if (inflight[key]) return inflight[key];

  inflight[key] = fetch(`${API_URL}/advanced-filters/${key}/values`, {
    credentials: "include",
  })
    .then((res) => res.json())
    .then((result) => {
      cache[key] = result.values || [];
      delete inflight[key];
      return cache[key];
    })
    .catch(() => {
      delete inflight[key];
      return [];
    });

  return inflight[key];
};

export const clearFilterValuesCache = (key) => {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
};

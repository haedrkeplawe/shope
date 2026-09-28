/*
  إعدادات الـ API المشتركة
  - API_URL: عنوان الـ API (شامل /api جوّاه)
  - ASSET_URL: عنوان جذر السيرفر (من غير /api) عشان نستخدمه مع مسارات الصور المرفوعة
*/
export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export const ASSET_URL = API_URL.replace(/\/api\/?$/, "");

/*
  getImageUrl
  - الصور بقت متخزنة على Cloudinary وبترجع كرابط كامل (https://res.cloudinary.com/...)
    فمنلزقش ASSET_URL قدامها زي الأول
  - لسه محتفظين بالتوافق مع أي صور قديمة كانت متخزنة محليًا كمسار نسبي (/uploads/...)
    لو موجودة في قاعدة البيانات من قبل التحويل لـ Cloudinary
*/
export const getImageUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${ASSET_URL}${path}`;
};

// user
/*
  إعدادات الـ API الخاصة بموقع المستخدم (الزبون)
  - نفس نمط config/api.js بلوحة تحكم الأدمن بالضبط
  - REACT_APP_API_URL لازم يشاور لنفس السيرفر الخلفي المستخدم بالأدمن
    (الباك إند واحد، بس الراوتس منفصلة: /api/customers بدل /api/store)
*/
export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export const ASSET_URL = API_URL.replace(/\/api\/?$/, "");

export const getImageUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${ASSET_URL}${path}`;
};

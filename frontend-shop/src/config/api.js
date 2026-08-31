/*
  إعدادات الـ API المشتركة
  - API_URL: عنوان الـ API (شامل /api جوّاه)
  - ASSET_URL: عنوان جذر السيرفر (من غير /api) عشان نستخدمه مع مسارات الصور المرفوعة
*/
export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export const ASSET_URL = API_URL.replace(/\/api\/?$/, "");

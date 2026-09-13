const cloudinary = require("cloudinary").v2;

/*
  إعداد اتصال Cloudinary
  - القيم بتيجي من ملف .env (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)
  - secure: true عشان كل الروابط الراجعة تكون https
*/
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;

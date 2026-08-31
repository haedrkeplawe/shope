const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
  ميدل وير رفع الصور - عام وقابل لإعادة الاستخدام (فئات، منتجات، أي حاجة لاحقًا)
  بيحفظ الملفات فعليًا في مجلد uploads/<folder> على السيرفر
  الاستخدام: const uploadCategoryImage = createUploader("categories");
*/
const createUploader = (folder) => {
  const uploadDir = path.join(__dirname, "..", "uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("صيغة الصورة غير مدعومة، يُسمح فقط بـ JPG/PNG/WEBP"));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB زي ما ظاهر بالتصميم
  });
};

module.exports = createUploader;

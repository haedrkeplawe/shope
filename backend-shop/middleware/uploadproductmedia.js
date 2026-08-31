const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
  ميدل وير رفع وسائط المنتج (صور متعددة + فيديو)
  - يقبل حقلين: images (حتى 10 صور) و video (ملف واحد)
  - الحد الأقصى موحّد 100MB عشان يغطي حجم الفيديو، والتحقق من نوع الملف
    بيفرّق بين الحقلين فعليًا
*/

const uploadDir = path.join(__dirname, "..", "uploads", "products");
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
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedVideoTypes = ["video/mp4", "video/quicktime"];

  if (file.fieldname === "images") {
    if (allowedImageTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("صيغة الصورة غير مدعومة، يُسمح فقط بـ JPG/PNG/WEBP"));
  }

  if (file.fieldname === "video") {
    if (allowedVideoTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("صيغة الفيديو غير مدعومة، يُسمح فقط بـ MP4/MOV"));
  }

  cb(new Error("حقل ملف غير معروف"));
};

const uploadProductMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB أقصى حد (يغطي الفيديو)
});

module.exports = uploadProductMedia;

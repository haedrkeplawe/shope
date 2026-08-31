const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinaryUpload");

/*
  ميدل وير رفع وسائط المنتج (صور متعددة + فيديو) - Cloudinary
  - يقبل حقلين: images (حتى 10 صور) و video (ملف واحد)
  - زي uploadImage.js: بنستخدم multer.memoryStorage() + رفع يدوي بالـ Buffer
    على Cloudinary (مش multer-storage-cloudinary) عشان نتجنب تعارض الإصدارات
    مع cloudinary v2

  الاستخدام في الراوت (خطوتين لازم يتسلسلوا مع بعض):
    router.post("/", uploadProductMedia, uploadProductMediaToCloudinary, createProduct);
*/

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

// الخطوة 1: استقبال الملفات في الذاكرة (multer)
const uploadProductMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB أقصى حد (يغطي الفيديو)
}).fields([
  { name: "images", maxCount: 10 },
  { name: "video", maxCount: 1 },
]);

// الخطوة 2: رفع الملفات الموجودة في req.files فعليًا على Cloudinary
const uploadProductMediaToCloudinary = async (req, res, next) => {
  try {
    const tasks = [];

    (req.files?.images || []).forEach((file) => {
      tasks.push(
        uploadBuffer(file.buffer, "store/products/images", "image").then(
          (result) => {
            file.path = result.secure_url;
            file.filename = result.public_id;
          },
        ),
      );
    });

    (req.files?.video || []).forEach((file) => {
      tasks.push(
        uploadBuffer(file.buffer, "store/products/videos", "video").then(
          (result) => {
            file.path = result.secure_url;
            file.filename = result.public_id;
          },
        ),
      );
    });

    await Promise.all(tasks);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadProductMedia, uploadProductMediaToCloudinary };

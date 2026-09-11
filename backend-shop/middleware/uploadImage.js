const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinaryUpload");

/*
  ميدل وير رفع الصور - عام وقابل لإعادة الاستخدام (فئات، منتجات، أي حاجة لاحقًا)
  بيرفع الصور مباشرة على Cloudinary بدل تخزينها محليًا على السيرفر
  (مهم خصوصًا على استضافات زي Render اللي بتمسح أي ملفات مخزنة محليًا مع كل ديبلوي)

  ملاحظة: بنستخدم multer.memoryStorage() + رفع يدوي بالـ Buffer على Cloudinary
  (مش multer-storage-cloudinary) عشان نتجنب تعارض الإصدارات مع cloudinary v2

  بعد الرفع req.file بيتحدث ليحتوي على:
    - file.path      → الرابط الكامل للصورة على Cloudinary (secure_url)
    - file.filename   → الـ public_id بتاع الصورة على Cloudinary (لازم نخزنه عشان نقدر نحذفها لاحقًا)

  الاستخدام: const uploadCategoryImage = createUploader("categories");
             uploadCategoryImage.single("image") // في الراوت
*/
const createUploader = (folder) => {
  const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("صيغة الصورة غير مدعومة، يُسمح فقط بـ JPG/PNG/WEBP"));
    }
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB زي ما ظاهر بالتصميم
  });

  return {
    // بيرجع مصفوفة ميدل ويرز: (1) multer بياخد الملف في الذاكرة، (2) رفعه فعليًا على Cloudinary
    single: (fieldName) => [
      upload.single(fieldName),
      async (req, res, next) => {
        if (!req.file) return next();
        try {
          const result = await uploadBuffer(
            req.file.buffer,
            `store/${folder}`,
            "image",
          );
          req.file.path = result.secure_url;
          req.file.filename = result.public_id;
          next();
        } catch (error) {
          next(error);
        }
      },
    ],
  };
};

module.exports = createUploader;

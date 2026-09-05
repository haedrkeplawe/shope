const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

/*
  uploadBuffer
  - بيرفع بفر (Buffer) موجود في الذاكرة مباشرة على Cloudinary من غير ما يتكتب
    على القرص أولًا (مفيد لما بنستخدم multer.memoryStorage())
  - resourceType: "image" أو "video"
*/
const uploadBuffer = (buffer, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...(resourceType === "image" && {
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        }),
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

module.exports = { uploadBuffer };

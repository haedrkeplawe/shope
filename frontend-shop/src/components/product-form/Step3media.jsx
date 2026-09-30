import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiUpload, FiX, FiImage, FiVideo, FiTrash2 } from "react-icons/fi";
import { getImageUrl } from "../../config/api";
import { IMAGE_TAG_OPTIONS } from "../../constants/Productoptions";

const MAX_IMAGES = 10;
const RECOMMENDED_MIN = 5;
const MAX_IMAGE_SIZE_MB = 8;
const MAX_VIDEO_SIZE_MB = 100;

/*
  Step3Media
  - رفع حتى 10 صور (Drag & Drop أو اختيار)، مع تحديد صورة كرئيسية وتصنيف باقي الصور
  - فيديو: رابط خارجي (YouTube/TikTok) أو رفع ملف مباشر
  - الصور الموجودة مسبقًا (وضع التعديل) بيكون معاها { url, existing: true }
    والصور الجديدة بيكون معاها { file, previewUrl }
*/
const Step3Media = ({ formData, updateField }) => {
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const images = formData.images || [];
  const completionPercent = Math.min(
    Math.round((images.length / RECOMMENDED_MIN) * 100),
    100,
  );

  const getImageSrc = (img) => {
    if (img.file) return img.previewUrl;
    return getImageUrl(img.url);
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList);
    const remainingSlots = MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {
      toast.error(`الحد الأقصى ${MAX_IMAGES} صور`);
      return;
    }

    const validFiles = [];
    files.slice(0, remainingSlots).forEach((file) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`صيغة "${file.name}" غير مدعومة`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`حجم "${file.name}" أكبر من ${MAX_IMAGE_SIZE_MB}MB`);
        return;
      }
      validFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        tags: [],
        isPrimary: false,
      });
    });

    if (validFiles.length === 0) return;

    const nextImages = [...images, ...validFiles];
    if (!nextImages.some((img) => img.isPrimary)) {
      nextImages[0].isPrimary = true;
    }
    updateField("images", nextImages);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    const wasPrimary = images[index].isPrimary;
    const next = images.filter((_, i) => i !== index);
    if (wasPrimary && next.length > 0) next[0].isPrimary = true;
    updateField("images", next);

    if (selectedIndex === index) setSelectedIndex(null);
    else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const setPrimary = (index) => {
    const next = images.map((img, i) => ({ ...img, isPrimary: i === index }));
    updateField("images", next);
  };

  const toggleTagOnSelected = (tag) => {
    if (selectedIndex === null) {
      toast.error("اختر صورة أولًا عشان تصنّفها");
      return;
    }

    if (tag === "الصورة الرئيسية") {
      setPrimary(selectedIndex);
      return;
    }

    const next = images.map((img, i) => {
      if (i !== selectedIndex) return img;
      const hasTag = img.tags.includes(tag);
      return {
        ...img,
        tags: hasTag ? img.tags.filter((t) => t !== tag) : [...img.tags, tag],
      };
    });
    updateField("images", next);
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["video/mp4", "video/quicktime"].includes(file.type)) {
      toast.error("صيغة الفيديو غير مدعومة، MP4 أو MOV فقط");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`حجم الفيديو أكبر من ${MAX_VIDEO_SIZE_MB}MB`);
      return;
    }
    updateField("videoFile", file);
  };

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="product-form-cards">
      {/* اكتمال الصور */}
      <div className="product-form-card">
        <div className="product-images-progress-header">
          <span className="product-images-progress-label">اكتمال الصور</span>
          <span className="product-images-progress-percent">
            {completionPercent}%
          </span>
        </div>
        <div className="product-images-progress-bar">
          <div
            className="product-images-progress-fill"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="product-form-hint">
          {images.length} / {MAX_IMAGES} صور مرفوعة - ينصح بـ {RECOMMENDED_MIN}{" "}
          صور على الأقل
        </p>
      </div>

      {/* رفع الصور */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiImage />
          رفع الصور
        </h3>

        <div
          className={`product-dropzone ${
            dragActive ? "product-dropzone--active" : ""
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <FiUpload />
          <span className="product-dropzone-title">
            اسحب الصور هنا أو اضغط للاختيار
          </span>
          <span className="product-dropzone-hint">
            PNG, JPG, WEBP · حتى {MAX_IMAGE_SIZE_MB}MB لكل صورة · بحد أقصى{" "}
            {MAX_IMAGES} صور
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={handleFileInputChange}
          />
        </div>

        {images.length > 0 && (
          <div className="product-images-grid">
            {images.map((img, index) => (
              <div
                key={index}
                className={`product-image-thumb ${
                  selectedIndex === index ? "product-image-thumb--selected" : ""
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <img src={getImageSrc(img)} alt={`صورة ${index + 1}`} />
                <button
                  type="button"
                  className="product-image-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <FiX />
                </button>
                {img.isPrimary && (
                  <span className="product-image-primary-badge">رئيسية</span>
                )}
                {img.tags.length > 0 && (
                  <span className="product-image-tag-badge">{img.tags[0]}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="product-form-group product-images-tags">
          <label>
            تصنيف الصور
            {selectedImage
              ? ` — الصورة ${selectedIndex + 1} المحددة`
              : " (اختر صورة من فوق أولًا)"}
          </label>
          <div className="product-tag-options">
            {IMAGE_TAG_OPTIONS.map((tag) => {
              const isActive =
                tag === "الصورة الرئيسية"
                  ? Boolean(selectedImage?.isPrimary)
                  : Boolean(selectedImage?.tags.includes(tag));
              return (
                <button
                  type="button"
                  key={tag}
                  className={`product-tag-option ${
                    isActive ? "product-tag-option--active" : ""
                  }`}
                  onClick={() => toggleTagOnSelected(tag)}
                  disabled={!selectedImage}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* فيديو المنتج */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiVideo />
          فيديو المنتج
        </h3>

        <div className="product-form-group">
          <label>رابط الفيديو</label>
          <input
            type="text"
            placeholder="https://youtube.com/..."
            value={formData.videoUrl}
            onChange={(e) => updateField("videoUrl", e.target.value)}
          />
          <p className="product-form-hint">
            يدعم YouTube, TikTok أو رفع ملف مباشر (MP4)
          </p>
        </div>

        <div
          className="product-dropzone product-dropzone--video"
          onClick={() => videoInputRef.current?.click()}
        >
          {formData.videoFile ? (
            <div className="product-video-selected">
              <FiVideo />
              <span>
                {formData.videoFile instanceof File
                  ? formData.videoFile.name
                  : "فيديو مرفوع مسبقًا"}
              </span>
              <button
                type="button"
                className="product-image-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  updateField("videoFile", null);
                }}
              >
                <FiTrash2 />
              </button>
            </div>
          ) : (
            <>
              <FiUpload />
              <span className="product-dropzone-title">
                أو ارفع ملف فيديو مباشرة
              </span>
              <span className="product-dropzone-hint">
                MP4, MOV · حتى {MAX_VIDEO_SIZE_MB}MB
              </span>
            </>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime"
            hidden
            onChange={handleVideoFileChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Step3Media;

// user
import { useState } from "react";
import { FiZoomIn, FiPlay, FiX, FiImage } from "react-icons/fi";
import { getImageUrl } from "../config/api";

/*
  ProductGallery
  - معرض صور/فيديو منتج واحد - صورة رئيسية كبيرة + صف مصغّرات تحتها
  - الصور جايّة مرتّبة من الباك (المميزة isPrimary أول واحدة)، والفيديو
    (لو موجود) بيترضاف كآخر مصغّرة - لو ملف مرفوع فعليًا (isFile) بيتشغّل
    مباشرة بمكان الصورة الرئيسية، ولو رابط خارجي بس بيفتح بتاب جديد
  - أيقونة التكبير بتفتح lightbox بسيط للصورة الحالية بس (مش سلايدر منفصل)
*/
const ProductGallery = ({ images = [], video, productName }) => {
  const slides = [
    ...images.map((img) => ({ type: "image", url: img.url })),
    video ? { type: "video", url: video.url, isFile: video.isFile } : null,
  ].filter(Boolean);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const active = slides[activeIndex];

  if (slides.length === 0) {
    return (
      <div className="pd-gallery">
        <div className="pd-gallery-main pd-gallery-main--empty">
          <FiImage />
        </div>
      </div>
    );
  }

  return (
    <div className="pd-gallery">
      <div className="pd-gallery-main">
        {active.type === "image" ? (
          <>
            <img
              src={getImageUrl(active.url)}
              alt={productName}
              onClick={() => setIsZoomOpen(true)}
            />
            <button
              type="button"
              className="pd-gallery-zoom-btn"
              aria-label="تكبير الصورة"
              onClick={() => setIsZoomOpen(true)}
            >
              <FiZoomIn />
            </button>
          </>
        ) : active.isFile ? (
          <video
            src={getImageUrl(active.url)}
            controls
            playsInline
            className="pd-gallery-video"
          />
        ) : (
          <a
            href={active.url}
            target="_blank"
            rel="noreferrer"
            className="pd-gallery-video-link"
          >
            <FiPlay />
            <span>مشاهدة الفيديو</span>
          </a>
        )}
      </div>

      {slides.length > 1 && (
        <div className="pd-gallery-thumbs">
          {slides.map((slide, index) => (
            <button
              key={`${slide.type}-${index}`}
              type="button"
              className={`pd-gallery-thumb${
                index === activeIndex ? " pd-gallery-thumb--active" : ""
              }`}
              onClick={() => setActiveIndex(index)}
            >
              {slide.type === "video" ? (
                <>
                  <img
                    src={getImageUrl(images[0]?.url || slide.url)}
                    alt="فيديو المنتج"
                  />
                  <span className="pd-gallery-thumb-play">
                    <FiPlay />
                  </span>
                </>
              ) : (
                <img src={getImageUrl(slide.url)} alt={productName} />
              )}
            </button>
          ))}
        </div>
      )}

      {isZoomOpen && active.type === "image" && (
        <div className="pd-lightbox" onClick={() => setIsZoomOpen(false)}>
          <button
            type="button"
            className="pd-lightbox-close"
            aria-label="إغلاق"
            onClick={() => setIsZoomOpen(false)}
          >
            <FiX />
          </button>
          <img src={getImageUrl(active.url)} alt={productName} />
        </div>
      )}
    </div>
  );
};

export default ProductGallery;

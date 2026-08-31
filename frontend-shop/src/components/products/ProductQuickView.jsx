import React from "react";
import { FiX, FiEye, FiHeart, FiImage } from "react-icons/fi";
import { ASSET_URL } from "../../config/api";

/*
  ProductQuickView
  - مودال معاينة سريعة، بيتفتح لما تدوس على أي منتج من الكارت/الجدول
*/
const ProductQuickView = ({ product, onClose, onEdit }) => {
  if (!product) return null;

  const primaryImage =
    product.images?.find((img) => img.isPrimary) || product.images?.[0];

  return (
    <div className="product-quickview-overlay" onClick={onClose}>
      <div
        className="product-quickview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="product-quickview-close"
          onClick={onClose}
        >
          <FiX />
        </button>

        <div className="product-quickview-image">
          {primaryImage ? (
            <img src={`${ASSET_URL}${primaryImage.url}`} alt={product.name} />
          ) : (
            <FiImage />
          )}
        </div>

        <h3 className="product-quickview-name">{product.name}</h3>
        <p className="product-quickview-category">
          {product.categoryId?.name || product.pieceType || "—"}
        </p>
        <p className="product-quickview-sku">{product.sku}</p>

        <div className="product-quickview-stats">
          <div className="product-quickview-stat">
            <span className="product-quickview-stat-label">المشاهدات</span>
            <span className="product-quickview-stat-value">
              <FiEye /> {product.viewsCount || 0}
            </span>
          </div>
          <div className="product-quickview-stat">
            <span className="product-quickview-stat-label">السعر</span>
            <span className="product-quickview-stat-value">
              {product.price} ل.س
            </span>
          </div>
          <div className="product-quickview-stat">
            <span className="product-quickview-stat-label">المقاس</span>
            <span className="product-quickview-stat-value">
              {(product.sizes || []).join("، ") || "—"}
            </span>
          </div>
        </div>

        <div className="product-quickview-actions">
          <button
            type="button"
            className="product-quickview-edit"
            onClick={() => onEdit(product)}
          >
            تعديل المنتج
          </button>
          <button
            type="button"
            className="product-quickview-cancel"
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickView;

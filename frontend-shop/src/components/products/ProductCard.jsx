import React from "react";
import { FiEye, FiHeart, FiImage, FiVideo } from "react-icons/fi";
import { getImageUrl } from "../../config/api";
import { getProductStatusBadge } from "../../utils/productStatus";
import { COLOR_HEX_MAP } from "../../constants/Productoptions";
import ActionsDropdown from "../ActionsDropdown";

/*
  ProductCard
  - كارت المنتج في عرض الشبكة (Grid)
  - actions: نفس نمط ActionsDropdown المستخدم في صفحة الفئات
*/
const ProductCard = ({ product, onQuickView, onEdit, onDelete }) => {
  const badge = getProductStatusBadge(product);
  const primaryImage =
    product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const hasDiscount = product.discountEnabled && product.originalPrice;

  return (
    <div className="product-card">
      <div className="product-card-image" onClick={() => onQuickView(product)}>
        {primaryImage ? (
          <img src={getImageUrl(primaryImage.url)} alt={product.name} />
        ) : (
          <FiImage />
        )}

        <span
          className={`product-card-badge product-card-badge--${badge.type}`}
        >
          {badge.label}
        </span>

        {(product.videoUrl || product.videoFile) && (
          <span className="product-card-video-indicator">
            <FiVideo />
          </span>
        )}

        <div className="product-card-menu" onClick={(e) => e.stopPropagation()}>
          <ActionsDropdown
            actions={[
              { label: "تعديل المنتج", onClick: () => onEdit(product) },
              { label: "عرض سريع", onClick: () => onQuickView(product) },
              {
                label: "حذف المنتج",
                onClick: () => onDelete(product),
                danger: true,
              },
            ]}
          />
        </div>
      </div>

      <div className="product-card-body">
        <h3 className="product-card-name" onClick={() => onQuickView(product)}>
          {product.name}
        </h3>
        <p className="product-card-category">
          {product.categoryId?.name || product.pieceType || "—"}
        </p>
        <p className="product-card-sku">{product.sku}</p>

        {product.colors?.length > 0 && (
          <div className="product-card-colors">
            {product.colors.slice(0, 5).map((color) => (
              <span
                key={color}
                className="product-color-swatch"
                title={color}
                style={{ backgroundColor: COLOR_HEX_MAP[color] || "#ccc" }}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="product-card-colors-more">
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}

        <div className="product-card-footer">
          <div className="product-card-price">
            <span className="product-card-price-current">
              {product.price} ل.س
            </span>
            {hasDiscount && (
              <span className="product-card-price-old">
                {product.originalPrice}
              </span>
            )}
          </div>

          <div className="product-card-stats">
            <span>
              <FiEye /> {product.viewsCount || 0}
            </span>
            <span>
              <FiHeart /> {product.likesCount || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

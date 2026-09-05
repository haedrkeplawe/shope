// user
import { Link } from "react-router-dom";
import { FiHeart, FiImage } from "react-icons/fi";
import { getImageUrl } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { useFavorites } from "../context/FavoritesContext";

/*
  ProductCard
  - كرت منتج مشترك - مستخدم هلق بقسم "جديدنا" بالصفحة الرئيسية وصفحة
    المفضلة، ورح يترستخدم لاحقًا بصفحة المتجر الكاملة وأي مكان تاني
    بيعرض منتجات
  - زر القلب مربوط فعليًا بـ FavoritesContext - بيوقف انتشار الحدث عشان
    ما يفتح صفحة المنتج بالغلط عند الضغط عليه، وبيتلوّن لو المنتج أصلاً
    بالمفضلة
*/
const ProductCard = ({ product }) => {
  const {
    id,
    name,
    brand,
    image,
    price,
    originalPrice,
    discountPercent,
    badgeLabel,
    size,
    singlePiece,
  } = product;

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(id);

  return (
    <Link to={`/product/${id}`} className="product-card">
      <div className="product-card-image">
        {image ? (
          <img src={getImageUrl(image)} alt={name} />
        ) : (
          <div className="product-card-image-placeholder">
            <FiImage />
          </div>
        )}

        <button
          type="button"
          className={`product-card-wishlist${
            favorite ? " product-card-wishlist--active" : ""
          }`}
          aria-label={favorite ? "إزالة من المفضلة" : "أضف للمفضلة"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(id);
          }}
        >
          <FiHeart />
        </button>

        {badgeLabel && (
          <span className="product-card-condition-badge">{badgeLabel}</span>
        )}

        {discountPercent && (
          <span className="product-card-discount-badge">
            {discountPercent}%-
          </span>
        )}
      </div>

      <div className="product-card-info">
        {brand && <span className="product-card-brand">{brand}</span>}
        <h3 className="product-card-name">{name}</h3>

        <div className="product-card-price-row">
          <span className="product-card-price">{formatPrice(price)} ل.س</span>
          {originalPrice && (
            <span className="product-card-original-price">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        <div className="product-card-meta">
          {size && <span className="product-card-size">{size}</span>}
          {singlePiece && (
            <span className="product-card-single">قطعة واحدة فقط</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

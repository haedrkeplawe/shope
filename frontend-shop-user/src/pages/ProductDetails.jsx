// user
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiShare2,
  FiHeart,
  FiShoppingBag,
  FiInfo,
  FiPlus,
  FiMinus,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiFileText,
  FiTruck,
  FiFeather,
  FiEye,
  FiClipboard,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import ProductGallery from "../components/ProductGallery";
import Accordion from "../components/Accordion";
import RelatedProducts from "../components/RelatedProducts";

const MEASUREMENT_LABELS = [
  { key: "chestWidth", label: "عرض الصدر" },
  { key: "shoulderWidth", label: "عرض الكتف" },
  { key: "totalLength", label: "الطول الكلي" },
  { key: "sleeveLength", label: "طول الكم" },
  { key: "waist", label: "الخصر" },
  { key: "hip", label: "الأرداف" },
];

/*
  ProductDetails (صفحة تفاصيل المنتج)
  - بتجيب تفاصيل المنتج الكاملة + منتجات ذات صلة بطلب واحد متوازي، بنفس
    وقت فتح الصفحة
  - "أضف للسلة" حاليًا بس Toast "قريبًا" - مفيش نظام سلة مشتريات فعلي
    بالباك اند لسه (نفس فلسفة صفحات ComingSoon الباقية بالموقع)
  - القلب والمشاركة فعليين 100%: القلب مربوط بـ FavoritesContext الحقيقي
    (نفس المستخدم بكل الموقع)، والمشاركة بتستخدم Web Share API لو مدعومة
    بالجهاز وإلا بتنسخ الرابط
*/
const ProductDetails = () => {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);
      window.scrollTo(0, 0);

      try {
        const [detailRes, relatedRes] = await Promise.all([
          fetch(`${API_URL}/shop/products/${id}`, { credentials: "include" }),
          fetch(`${API_URL}/shop/products/${id}/related`, {
            credentials: "include",
          }),
        ]);

        if (ignore) return;

        if (!detailRes.ok) {
          setNotFound(true);
          return;
        }

        const detailData = await detailRes.json();
        setProduct(detailData.product);

        const firstAvailable = detailData.product.sizeScale?.find(
          (s) => s.available,
        );
        setSelectedSize(firstAvailable?.value || null);
        setQuantity(1);

        if (relatedRes.ok) {
          const relatedData = await relatedRes.json();
          setRelatedProducts(relatedData.products || []);
        }
      } catch (error) {
        if (!ignore) setNotFound(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="pd-loading">
        <span className="pd-spinner" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="pd-not-found">
        <h2>هاي القطعة مش موجودة</h2>
        <p>ممكن تكون اتحذفت أو الرابط غير صحيح</p>
        <Link to="/" className="pd-not-found-link">
          الرجوع للرئيسية
        </Link>
      </div>
    );
  }

  const { badges } = product;
  const hasAvailableSizes = product.sizeScale?.some((s) => s.available);
  const canOrder = !badges.soldOut && !badges.reserved && product.quantity > 0;

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: product.name,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // المستخدم لغى المشاركة - تجاهل
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط المنتج");
    } catch (error) {
      toast.error("تعذر نسخ الرابط");
    }
  };

  const handleAddToCart = async () => {
    // حماية إضافية - الـ stepper أصلاً بيمنع تخطي product.quantity، وهاي
    // نفس القاعدة بمستوى المنطق نفسه دفاعيًا قبل ما نرسل الطلب للسيرفر
    // (يلي بيعيد نفس التحقق مرة كمان بشكل نهائي وموثوق)
    if (quantity > product.quantity) {
      toast.error("الكمية المطلوبة أكبر من المتوفر فعليًا");
      return;
    }

    setIsAddingToCart(true);
    await addToCart(product.id, { size: selectedSize, quantity });
    setIsAddingToCart(false);
  };

  const stockLine = badges.soldOut
    ? { text: "نفذت الكمية", tone: "danger" }
    : badges.reserved
    ? { text: "هذه القطعة محجوزة حاليًا", tone: "warning" }
    : product.quantity <= 3
    ? {
        text:
          product.quantity === 1
            ? "قطعة واحدة متبقية فقط"
            : `${product.quantity} قطع متبقية فقط`,
        tone: "warning",
      }
    : null;

  return (
    <div className="pd-page">
      {/* -------------------- مسار التنقل -------------------- */}
      <nav className="pd-breadcrumb">
        <Link to="/">الرئيسية</Link>
        <span>›</span>
        <Link to="/shop">المتجر</Link>
        <span>›</span>
        <span className="pd-breadcrumb-current">{product.name}</span>
      </nav>

      <ProductGallery
        images={product.images}
        video={product.video}
        productName={product.name}
      />

      <div className="pd-info">
        {/* -------------------- البادجات + عداد المشاهدات -------------------- */}
        {(badges.featured || badges.limitedQuantity || badges.reserved) && (
          <div className="pd-badges">
            {badges.featured && (
              <span className="pd-badge pd-badge--featured">مميزة</span>
            )}
            {badges.reserved && (
              <span className="pd-badge pd-badge--warning">محجوزة</span>
            )}
            {!badges.reserved && badges.limitedQuantity && (
              <span className="pd-badge pd-badge--warning">الكمية محدودة</span>
            )}
          </div>
        )}

        {product.viewsCount > 0 && (
          <p className="pd-views">
            <FiEye /> {product.viewsCount} شخص شاهد هذه القطعة
          </p>
        )}

        {/* -------------------- الاسم + البراند -------------------- */}
        <h1 className="pd-name">{product.name}</h1>
        {product.brand && <span className="pd-brand">{product.brand}</span>}

        {/* -------------------- السعر -------------------- */}
        <div className="pd-price-row">
          <span className="pd-price">{formatPrice(product.price)} ل.س</span>
          {product.originalPrice && (
            <span className="pd-original-price">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          {product.discountPercent && (
            <span className="pd-discount-badge">
              {product.discountPercent}%- خصم
            </span>
          )}
        </div>

        {/* -------------------- المقاسات -------------------- */}
        {hasAvailableSizes && (
          <div className="pd-size-section">
            <div className="pd-size-header">
              <span className="pd-size-label">المقاس</span>
              {product.measurements && (
                <button
                  type="button"
                  className="pd-size-guide-btn"
                  onClick={() => setIsSizeGuideOpen(true)}
                >
                  <FiInfo /> دليل المقاسات
                </button>
              )}
            </div>

            <div className="pd-size-options">
              {product.sizeScale.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={!s.available}
                  className={`pd-size-chip${
                    selectedSize === s.value ? " pd-size-chip--active" : ""
                  }`}
                  onClick={() => setSelectedSize(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {stockLine && (
          <p className={`pd-stock-line pd-stock-line--${stockLine.tone}`}>
            {stockLine.text}
          </p>
        )}

        {/* -------------------- الكمية -------------------- */}
        {canOrder && product.quantity > 1 && (
          <div className="pd-qty-section">
            <span className="pd-qty-label">
              الكمية{" "}
              <span className="pd-qty-available">
                (متبقي {product.quantity})
              </span>
            </span>
            <div className="pd-qty-stepper">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="إنقاص الكمية"
              >
                <FiMinus />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(product.quantity, q + 1))
                }
                disabled={quantity >= product.quantity}
                aria-label="زيادة الكمية"
              >
                <FiPlus />
              </button>
            </div>
          </div>
        )}

        {/* -------------------- الإجراءات -------------------- */}
        <div className="pd-actions">
          <button
            type="button"
            className="pd-icon-btn"
            onClick={handleShare}
            aria-label="مشاركة"
          >
            <FiShare2 />
          </button>

          <button
            type="button"
            className={`pd-icon-btn${
              isFavorite(product.id) ? " pd-icon-btn--active" : ""
            }`}
            onClick={() => toggleFavorite(product.id)}
            aria-label={
              isFavorite(product.id) ? "إزالة من المفضلة" : "أضف للمفضلة"
            }
          >
            <FiHeart />
          </button>

          <button
            type="button"
            className="pd-add-to-cart"
            onClick={handleAddToCart}
            disabled={!canOrder || isAddingToCart}
          >
            <FiShoppingBag />
            {!canOrder
              ? badges.reserved
                ? "محجوزة حاليًا"
                : "نفذت الكمية"
              : isAddingToCart
              ? "جاري الإضافة..."
              : "أضف للسلة"}
          </button>
        </div>

        {/* -------------------- تقرير الفحص -------------------- */}
        {(product.condition || product.inspectionReport.length > 0) && (
          <div className="pd-inspection">
            <h3 className="pd-section-title">
              <FiClipboard /> تقرير الفحص
            </h3>

            {product.condition && (
              <div className="pd-inspection-row">
                <span className="pd-inspection-label">الحالة العامة</span>
                <span className="pd-inspection-value pd-inspection-value--ok">
                  <FiCheckCircle /> {product.condition}
                </span>
              </div>
            )}

            {product.qualityRating && (
              <div className="pd-inspection-row">
                <span className="pd-inspection-label">مؤشر الجودة</span>
                <span className="pd-inspection-value pd-inspection-value--ok">
                  <FiCheckCircle /> {product.qualityRating}
                </span>
              </div>
            )}

            {product.inspectionReport.map((item) => (
              <div key={item.key} className="pd-inspection-row">
                <span className="pd-inspection-label">{item.label}</span>
                <span
                  className={`pd-inspection-value pd-inspection-value--${item.status}`}
                >
                  {item.status === "ok" ? <FiCheckCircle /> : <FiAlertCircle />}
                  {item.status === "ok"
                    ? "سليم"
                    : item.description || "يوجد ملاحظة"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* -------------------- الأقسام القابلة للطي -------------------- */}
        <div className="pd-accordions">
          {(product.fabric.mainFabric ||
            product.fabric.fabricDensity ||
            product.fabric.fabricElasticity ||
            product.fabric.composition.length > 0) && (
            <Accordion title="تفاصيل القماش" icon={FiFeather}>
              {product.fabric.mainFabric && (
                <div className="pd-detail-row">
                  <span>نوع القماش</span>
                  <span>{product.fabric.mainFabric}</span>
                </div>
              )}
              {product.fabric.fabricDensity && (
                <div className="pd-detail-row">
                  <span>كثافة القماش</span>
                  <span>{product.fabric.fabricDensity}</span>
                </div>
              )}
              {product.fabric.fabricElasticity && (
                <div className="pd-detail-row">
                  <span>مرونة القماش</span>
                  <span>{product.fabric.fabricElasticity}</span>
                </div>
              )}
              {product.fabric.composition.length > 0 && (
                <div className="pd-fabric-composition">
                  {product.fabric.composition.map((c, i) => (
                    <span key={i} className="pd-fabric-chip">
                      {c.material} {c.percentage}%
                    </span>
                  ))}
                </div>
              )}
            </Accordion>
          )}

          {(product.detailedDescription || product.whySpecial) && (
            <Accordion title="وصف المنتج" icon={FiFileText}>
              {product.detailedDescription && (
                <p className="pd-description-text">
                  {product.detailedDescription}
                </p>
              )}
              {product.whySpecial && (
                <>
                  <h4 className="pd-why-special-title">ليش هاي القطعة مميزة</h4>
                  <p className="pd-description-text">{product.whySpecial}</p>
                </>
              )}
            </Accordion>
          )}

          {product.careInstructions.length > 0 && (
            <Accordion title="طريقة العناية" icon={FiRefreshCw}>
              <ul className="pd-care-list">
                {product.careInstructions.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </Accordion>
          )}

          <Accordion title="الشحن والإرجاع" icon={FiTruck}>
            <p className="pd-description-text">
              كل قطعة بمتجر طراز مُعاد بيعها ومفحوصة بعناية، وحالتها موضّحة
              بالكامل بتقرير الفحص أعلاه قبل ما تشتريها. للاستفسار عن تفاصيل
              الشحن أو الإرجاع الخاصة بطلبك، تواصل معنا مباشرة.
            </p>
          </Accordion>
        </div>
      </div>

      <RelatedProducts products={relatedProducts} />

      {/* -------------------- مودال دليل المقاسات -------------------- */}
      {isSizeGuideOpen && product.measurements && (
        <div
          className="pd-modal-overlay"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-header">
              <h3>قياسات هذه القطعة (سم)</h3>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                aria-label="إغلاق"
              >
                <FiX />
              </button>
            </div>
            <div className="pd-modal-body">
              {MEASUREMENT_LABELS.map(
                ({ key, label }) =>
                  product.measurements[key] != null && (
                    <div key={key} className="pd-detail-row">
                      <span>{label}</span>
                      <span>{product.measurements[key]} سم</span>
                    </div>
                  ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;

// user
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiImage, FiArrowLeft } from "react-icons/fi";
import { API_URL } from "../../config/api";
import image4 from "../../assets/image4.jpg";
import image5 from "../../assets/image5.jpg";
import image6 from "../../assets/image6.jpg";
import image7 from "../../assets/image7.jpg";
import image8 from "../../assets/image8.jpg";
import image9 from "../../assets/image9.jpg";
import image10 from "../../assets/image10.jpg";
import image11 from "../../assets/image11.jpg";

/*
  ShopByPieceType
  ------------------------------------------------------------------
  قسم "تسوق حسب الفئة" بالصفحة الرئيسية - تحت قسم "تصفح حسب الفئة"
  (ShopByCategory) مباشرة، ونفس آلية عمله بالضبط، بس مبني على قيم فلتر
  "نوع المنتج" (piece_type) مش على موديل Category

  - بيانات حقيقية من /api/shop/piece-types (عدّاد المنتجات لكل قيمة
    محسوب لحظيًا من منتجات منشورة فعليًا)
  - بيعرض كل القيم النشطة (بترتيب "order" يلي الأدمن بيتحكم فيه من صفحة
    "الفلاتر المتقدمة") - شبكة 2 أعمدة بتطول حسب عدد القيم، و"عرض الكل"
    بيودّي لصفحة المتجر مع فتح درج الفلاتر مباشرة على قسم "نوع المنتج"
    (نفس منطق "اكتشف المجموعات"/"البراندات" بالضبط -
    location.state.openSection) كاختصار سريع لدمجها مع فلاتر تانية
  - الضغط على أي كارت بيودّي لصفحة المتجر (/shop) مع تفعيل فلتر
    piece_type تلقائيًا (?piece_type=<value>)
  - القسم كامل ما بيترسم لو مافي قيم نشطة أصلاً (نفس فلسفة NewArrivals/
    ShopByCategory بالضبط)

  ⚠️ الصور: فلتر "نوع المنتج" قيم نصية بس (مفيش حقل صورة بالباك إند
  أصلاً - شوف shop.controller.js → getPieceTypes) فالصور هون خريطة
  محلية بالفرونت (قيمة الفلتر الداخلية → رابط صورة) - لازم تتعبّى يدويًا.
  عبّي الروابط تحت بالقيم الافتراضية (من seedDefaults.js)، ولو ضفت قيمة
  جديدة من لوحة التحكم لاحقًا ضيف سطر إلها هون بنفس الطريقة. أي قيمة
  بدون صورة بتترسم بأيقونة بديلة (FiImage) تلقائيًا بدل ما تكسر التصميم
*/
const PIECE_TYPE_IMAGES = {
  فستان: image4,
  جاكيت: image10,
  قميص: image11,
  بلايزر: image8,
  بلوزة: image10,
  بنطال: image5,
  تنورة: image4,
  كارديجان: image4,
  معطف: image9,
  حذاء: image6,
  حقيبة: image7,
  إكسسوار: image6,
};

const ShopByPieceType = () => {
  const [pieceTypes, setPieceTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPieceTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/piece-types`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setPieceTypes(data.pieceTypes || []);
      } catch (error) {
        // تجاهل - القسم بس ما بيترسم لو فشل الطلب
      } finally {
        setLoading(false);
      }
    };

    fetchPieceTypes();
  }, []);

  if (loading || pieceTypes.length === 0) return null;

  return (
    <section className="piece-types-section">
      <div className="brands-header">
        <span className="brands-overline">الفئات</span>
        <h2 className="brands-title">تسوق حسب الفئة</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <Link
        to="/shop"
        state={{ openSection: "piece_type" }}
        className="new-arrivals-view-all"
      >
        <FiArrowLeft />
        عرض الكل
      </Link>

      <div className="categories-grid">
        {pieceTypes.map((type) => {
          const image = PIECE_TYPE_IMAGES[type.value];
          return (
            <Link
              to={`/shop?piece_type=${encodeURIComponent(type.value)}`}
              key={type.value}
              className="category-card"
            >
              <div className="category-card-image">
                {image ? (
                  <img src={image} alt={type.label} />
                ) : (
                  <div className="category-card-placeholder">
                    <FiImage />
                  </div>
                )}
              </div>

              <span className="category-card-overlay" />

              <div className="category-card-info">
                <h3 className="category-card-name">{type.label}</h3>
                <span className="category-card-count">
                  {type.productsCount} منتج
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default ShopByPieceType;

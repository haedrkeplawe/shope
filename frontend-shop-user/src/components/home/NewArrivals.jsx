// user
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { API_URL } from "../../config/api";
import ProductCard from "../ProductCard";
import {
  getHomeSectionCache,
  setHomeSectionCache,
} from "../../utils/homeSectionCache";

const CACHE_KEY = "/shop/new-arrivals";

/*
  NewArrivals
  - آخر 4 منتجات منشورة (إن وجدت) - بيانات حقيقية من /api/shop/new-arrivals
  - القسم كامل ما بيترسم لو مافي منتجات منشورة أصلاً (بدل هيدر فاضي بدون محتوى)
  - "عرض الكل" بيوديك لصفحة المتجر (/shop) مع تفعيل فلتر "وصل حديثًا"
    تلقائيًا (isNew=1) - عشان الصفحة تعرض كل قطع "جديدنا" مش المتجر كامل
  - بيانات القسم متخزّنة بكاش مشترك (homeSectionCache) عشان القسم ما
    يختفي ويرجع يظهر (وميض) كل مرة الرئيسية تتبنى من جديد - مثلاً لما
    المستخدم يرجع من صفحة منتج بزر رجوع المتصفح
*/
const NewArrivals = () => {
  const cached = getHomeSectionCache(CACHE_KEY);
  const [products, setProducts] = useState(cached?.products || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;

    const fetchNewArrivals = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/new-arrivals`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          const list = data.products || [];
          setProducts(list);
          setHomeSectionCache(CACHE_KEY, { products: list });
        }
      } catch (error) {
        // تجاهل - القسم بس ما بيترسم لو فشل الطلب
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="new-arrivals">
      <div className="brands-header">
        <span className="brands-overline">وصل حديثًا</span>
        <h2 className="brands-title">جديدنا هذا الأسبوع</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <Link to="/shop?isNew=1" className="new-arrivals-view-all">
        <FiArrowLeft />
        عرض الكل
      </Link>

      <div className="new-arrivals-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default NewArrivals;

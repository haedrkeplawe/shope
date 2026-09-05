// user
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { API_URL } from "../../config/api";
import ProductCard from "../ProductCard";

/*
  NewArrivals
  - آخر 4 منتجات منشورة (إن وجدت) - بيانات حقيقية من /api/shop/new-arrivals
  - القسم كامل ما بيترسم لو مافي منتجات منشورة أصلاً (بدل هيدر فاضي بدون محتوى)
  - "عرض الكل" بيوديك لصفحة /shop (Placeholder حاليًا، رح تتخصص لاحقًا)
*/
const NewArrivals = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/new-arrivals`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setProducts(data.products || []);
      } catch (error) {
        // تجاهل - القسم بس ما بيترسم لو فشل الطلب
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
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

      <Link to="/shop" className="new-arrivals-view-all">
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

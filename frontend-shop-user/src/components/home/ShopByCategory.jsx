// user
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiImage } from "react-icons/fi";
import { API_URL, getImageUrl } from "../../config/api";

/*
  ShopByCategory
  - قسم "تصفح حسب الفئة" بالصفحة الرئيسية - بيانات حقيقية من
    /api/shop/categories
  - بيعرض الأقسام الرئيسية بس (مش الفئات الفرعية)، وبعدّاد منتجات
    تراكمي (منتجات القسم المباشرة + كل فئاته الفرعية سوا) - نفس منطق
    getOverview بلوحة تحكم الأدمن بالضبط
  - القسم كامل ما بيترسم لو مافي أقسام رئيسية نشطة أصلاً (نفس فلسفة
    NewArrivals بالضبط)
  - الضغط على أي قسم بيودي لصفحة /shop حاليًا (لسه Placeholder) - رح
    نربطها بفلترة فعلية بالفئة لما نبني صفحة المتجر الكاملة
*/
const ShopByCategory = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/categories`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setCategories(data.categories || []);
      } catch (error) {
        // تجاهل - القسم بس ما بيترسم لو فشل الطلب
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading || categories.length === 0) return null;

  return (
    <section className="categories-section">
      <div className="brands-header">
        <span className="brands-overline">اكتشف عالمن</span>
        <h2 className="brands-title">تصفح حسب الفئة</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <div className="categories-grid">
        {categories.map((cat) => (
          <Link to="/shop" key={cat.id} className="category-card">
            <div className="category-card-image">
              {cat.image ? (
                <img src={getImageUrl(cat.image)} alt={cat.name} />
              ) : (
                <div className="category-card-placeholder">
                  <FiImage />
                </div>
              )}
            </div>

            <span className="category-card-overlay" />

            <div className="category-card-info">
              <h3 className="category-card-name">{cat.name}</h3>
              <span className="category-card-count">
                {cat.productsCount} قطعة
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ShopByCategory;

// user
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiImage } from "react-icons/fi";
import { API_URL, getImageUrl } from "../../config/api";
import {
  getHomeSectionCache,
  setHomeSectionCache,
} from "../../utils/homeSectionCache";

const CACHE_KEY = "/shop/categories";

/*
  ShopByCategory
  - قسم "تصفح حسب الفئة" بالصفحة الرئيسية - بيانات حقيقية من
    /api/shop/categories
  - بيعرض الأقسام الرئيسية بس (مش الفئات الفرعية)، وبعدّاد منتجات
    تراكمي (منتجات القسم المباشرة + كل فئاته الفرعية سوا) - نفس منطق
    getOverview بلوحة تحكم الأدمن بالضبط
  - القسم كامل ما بيترسم لو مافي أقسام رئيسية نشطة أصلاً (نفس فلسفة
    NewArrivals بالضبط)
  - الضغط على أي قسم بيودي لصفحة المتجر (/shop) مع تفعيل فلتر هاي الفئة
    تلقائيًا (?category=id) - المتجر بيوسّع الفلتر ليشمل كل الفئات
    الفرعية التابعة للقسم كمان (نفس منطق applyOffers/related products)
  - بيانات القسم متخزّنة بكاش مشترك (homeSectionCache) عشان القسم ما
    يختفي ويرجع يظهر (وميض) كل مرة الرئيسية تتبنى من جديد
*/
const ShopByCategory = () => {
  const cached = getHomeSectionCache(CACHE_KEY);
  const [categories, setCategories] = useState(cached?.categories || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;

    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/categories`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          const list = data.categories || [];
          setCategories(list);
          setHomeSectionCache(CACHE_KEY, { categories: list });
        }
      } catch (error) {
        // تجاهل - القسم بس ما بيترسم لو فشل الطلب
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || categories.length === 0) return null;

  return (
    <section className="categories-section">
      <div className="brands-header">
        <span className="brands-overline">اكتشف عالمن</span>
        <h2 className="brands-title">تصفح حسب الاصناف</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <div className="categories-grid">
        {categories.map((cat) => (
          <Link
            to={`/shop?category=${cat.id}`}
            key={cat.id}
            className="category-card"
          >
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

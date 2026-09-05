// user
import { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";
import { API_URL } from "../config/api";
import ProductCard from "../components/ProductCard";

/*
  Favorites (صفحة المفضلة)
  - بتعرض كل منتجات المفضلة الحقيقية من /api/customers/favorites، بنفس
    كرت المنتج (ProductCard) المستخدم بقسم "جديدنا" وأي مكان تاني بالموقع
  - الضغط على الكارد بيوديك لصفحة تفاصيل المنتج (زي أي كارد تاني) - مفيش
    منطق إضافي هون، الكارد نفسه بيتكفّل بكل شي (بما فيها زر إزالة المفضلة)
  - حالة فاضية واضحة لو الزبون لسا ما ضاف ولا منتج
*/
const Favorites = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/favorites`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setProducts(data.products || []);
      } catch (error) {
        // تجاهل - بترسم حالة فاضية زي ما لو ما في منتجات أصلاً
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  if (loading) return null;

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <h1 className="favorites-title">المفضلة</h1>
        {products.length > 0 && (
          <span className="favorites-count">{products.length} قطعة</span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="favorites-empty">
          <FiHeart className="favorites-empty-icon" />
          <h2 className="favorites-empty-title">مفضلتك فاضية لسه</h2>
          <p className="favorites-empty-text">
            اضغط على أيقونة القلب بأي قطعة تعجبك عشان تضيفها هون
          </p>
        </div>
      ) : (
        <div className="favorites-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;

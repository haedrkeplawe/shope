// user
import ProductCard from "./ProductCard";

/*
  RelatedProducts ("قد يعجبك أيضًا")
  - نفس ProductCard المستخدم بكل الموقع - ما فيه أي منطق عرض خاص هون،
    بس شبكة + عنوان القسم
  - بيرجع null كليًا لو القائمة فاضية (مفيش منتجات ذات صلة) بدل ما نعرض
    قسم فاضي بلا فايدة
*/
const RelatedProducts = ({ products = [] }) => {
  if (products.length === 0) return null;

  return (
    <section className="pd-related">
      <h2 className="pd-related-title">قد يعجبك أيضًا</h2>
      <div className="pd-related-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;

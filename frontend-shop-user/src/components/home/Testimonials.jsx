// user
import { useEffect, useState } from "react";
import { FiUser } from "react-icons/fi";
import { API_URL } from "../../config/api";
import StarRating from "../StarRating";

/*
  Testimonials
  ------------------------------------------------------------------
  قسم "آراء عملائنا" بالصفحة الرئيسية - أفضل 4 تقييمات حقيقية (موافق
  عليها من الأدمن حصرًا + الأعلى تقييمًا) من /api/shop/testimonials
  (شوف شرح الاختيار الكامل بـ shop.controller.js → getTestimonials)

  - القسم كامل ما بيترسم لو مافي تقييمات موافق عليها بتعليق نصي بعد
    (نفس فلسفة NewArrivals/ShopByCategory بالضبط - قسم فاضي أحسن من
    قسم بمحتوى غير موجود)
  - "المدينة" تحت اسم الزبون اختيارية - بتترسم بس لو متوفرة (شوف
    getTestimonials بالباك إند ليه ممكن تكون فاضية أحيانًا)
*/
const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/testimonials`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setTestimonials(data.testimonials || []);
      } catch (error) {
        // تجاهل - القسم بس ما بيترسم لو فشل الطلب
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  if (loading || testimonials.length === 0) return null;

  return (
    <section className="testimonials-section">
      <div className="brands-header">
        <span className="brands-overline">تجارب حقيقية</span>
        <h2 className="brands-title">آراء عملائنا</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <div className="testimonials-list">
        {testimonials.map((t) => (
          <div className="testimonial-card" key={t.id}>
            <div className="testimonial-header">
              <div className="testimonial-info">
                <h3 className="testimonial-name">{t.customerName}</h3>
                {t.city && <span className="testimonial-city">{t.city}</span>}
              </div>
              <span className="testimonial-avatar">
                <FiUser />
              </span>
            </div>

            <div className="testimonial-stars">
              <StarRating value={t.value} size={16} />
            </div>

            <p className="testimonial-comment">"{t.comment}"</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;

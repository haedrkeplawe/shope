// user
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import heroImage from "../../assets/image1.jpg";
import TrustBadges from "./TrustBadges";

/*
  HeroSection
  - أول قسم بالصفحة الرئيسية - صورة خلفية + عنوان/وصف ثابتين + زرين
  - الزرين الآن فعليين وبيودّوا لصفحة المتجر (/shop) بس بطريقة مختلفة:
    - "تسوق الآن": يفتح المتجر عادي بدون أي فلتر
    - "اكتشف المجموعات": يفتح نفس المتجر، بس بيفتح درج الفلاتر تلقائيًا
      على قسم "الفئة" (state.openSection - تمريرة عابرة بس، مش فلتر
      محفوظ بالرابط، شوف تعليق Shop.jsx للتفاصيل)
  - ترتيب الأزرار بالـ DOM: "اكتشف المجموعات" أولاً (بيطلع يمين الصف
    بسياق RTL) و"تسوق الآن" ثانيًا (بيطلع يسار الصف) - مطابق للتصميم
*/
const HeroSection = () => {
  return (
    <section
      className="hero-section"
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      <div className="hero-overlay" />

      <div className="hero-content">
        <h1 className="hero-title">
          أزياء مستعملة بحالة ممتازة
          <br />
          تستحق الثقة
        </h1>

        <p className="hero-subtitle">
          اكتشف أندر قطع الأزياء الفاخرة مع ضمان الأصالة
          <br />
          والجودة
        </p>

        <div className="hero-actions">
          <Link
            to="/shop"
            state={{ openSection: "category" }}
            className="hero-btn hero-btn--outline"
          >
            اكتشف المجموعات
          </Link>

          <Link to="/shop" className="hero-btn hero-btn--filled">
            <span>تسوق الآن</span>
            <FiArrowLeft />
          </Link>
        </div>
      </div>

      <TrustBadges />
    </section>
  );
};

export default HeroSection;

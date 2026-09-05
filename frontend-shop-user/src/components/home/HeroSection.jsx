// user
import { FiArrowLeft } from "react-icons/fi";
import heroImage from "../../assets/image1.jpg";
import TrustBadges from "./TrustBadges";

/*
  HeroSection
  - أول قسم بالصفحة الرئيسية - صورة خلفية + عنوان/وصف ثابتين + زرين
  - الزرين شكليين بس حاليًا (بدون أي وظيفة أو راوت) بناءً على طلب صريح
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
          <button type="button" className="hero-btn hero-btn--outline">
            اكتشف المجموعات
          </button>

          <button type="button" className="hero-btn hero-btn--filled">
            <span>تسوق الآن</span>
            <FiArrowLeft />
          </button>
        </div>
      </div>

      <TrustBadges />
    </section>
  );
};

export default HeroSection;

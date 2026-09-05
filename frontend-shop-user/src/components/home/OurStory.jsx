// user
import { Link } from "react-router-dom";
import { FiAward, FiShield, FiArrowLeft } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import storyImage from "../../assets/image3.jpg";

/*
  OurStory
  - قسم "قصتنا" بالصفحة الرئيسية - شكلي بالكامل، محتوى ثابت (بدون أي
    منطق أو ربط API، بالضبط زي قسم TrustFeatures)
  - صورة بشارة "تأسست في 2018" فوقها (أسفل يسار الصورة)، نص تعريفي،
    3 قيم مختصرة (الجودة/الأصالة/الثقة)، ورابط "اعرف أكثر عنا"
  - "اعرف أكثر عنا" بيودي لصفحة /about حاليًا (لسه مش مبنية - Placeholder
    زي باقي روابط الموقع لحد ما نبنيها فعليًا)
*/
const VALUES = [
  { icon: HiSparkles, label: "الجودة" },
  { icon: FiAward, label: "الأصالة" },
  { icon: FiShield, label: "الثقة" },
];

const OurStory = () => {
  return (
    <section className="our-story-section">
      <div className="our-story-image-wrap">
        <img src={storyImage} alt="Maison Rêva" className="our-story-image" />
        <div className="our-story-badge">
          <span className="our-story-badge-label">تأسست في</span>
          <span className="our-story-badge-year">2018</span>
        </div>
      </div>

      <div className="our-story-content">
        <span className="our-story-overline">قصتنا</span>
        <h2 className="our-story-title">
          بيت الأزياء الفاخرة
          <br />
          الموثوق في العالم العربي
        </h2>
        <p className="our-story-text">
          وُلدت Maison Rêva من إيمان عميق بأن كل شخص يستحق ارتداء الأزياء
          الفاخرة بثقة وشفافية كاملة. نحن لسنا مجرد متجر - نحن بيت للأناقة يجمع
          بين رقي المجلة العالمية وثقة السوق المعتمد.
        </p>

        <div className="our-story-values">
          {VALUES.map(({ icon: Icon, label }) => (
            <div className="our-story-value" key={label}>
              <span className="our-story-value-icon">
                <Icon />
              </span>
              <span className="our-story-value-label">{label}</span>
            </div>
          ))}
        </div>

        <Link to="/about" className="our-story-link">
          <FiArrowLeft />
          اعرف أكثر عنا
        </Link>
      </div>
    </section>
  );
};

export default OurStory;

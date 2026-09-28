// user
import { FiAward, FiShield, FiRotateCcw, FiCheckCircle } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

/*
  TrustFeatures
  - قسم "لماذا Maison Rêva؟" بالصفحة الرئيسية - شكلي بالكامل، محتوى ثابت
    (مفيش أي بيانات ديناميكية وراه، ولا المفروض يكون - طلب صريح)
  - 5 عناصر بشبكة عمودين - العنصر الخامس (الفردي) بيطلع لحاله بالصف
    الأخير بأقصى اليمين تلقائيًا (سلوك الـ Grid الطبيعي بصفحة RTL)،
    بالضبط زي التصميم المرفق
*/
const FEATURES = [
  {
    icon: FiAward,
    title: "ضمان الجودة",
    text: "شهادة أصالة لكل منتج معتمد",
  },
  {
    icon: FiShield,
    title: "فحص يدوي",
    text: "كل قطعة تخضع لفحص دقيق من خبرائنا",
  },
  {
    icon: FiRotateCcw,
    title: "ضمان الإرجاع",
    text: "إرجاع مجاني خلال ١٤ يومًا",
  },
  {
    icon: HiSparkles,
    title: "تنظيف وتعقيم",
    text: "تنظيف احترافي قبل الشحن مباشرة",
  },
  {
    icon: FiCheckCircle,
    title: "ضمان الأصالة",
    text: "نضمن أصالة كل قطعة أو نسترد ثمنها",
  },
];

const FeatureCard = ({ icon: Icon, title, text }) => (
  <div className="trust-features-card">
    <span className="trust-features-icon">
      <Icon />
    </span>
    <h3 className="trust-features-title">{title}</h3>
    <p className="trust-features-text">{text}</p>
  </div>
);

const TrustFeatures = () => {
  return (
    <section className="trust-features-section">
      <div className="brands-header">
        <span className="brands-overline">ثقة و شفافية</span>
        <h2 className="trust-features-title-main">لماذا Maison Rêva؟</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <div className="trust-features-grid">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
};

export default TrustFeatures;

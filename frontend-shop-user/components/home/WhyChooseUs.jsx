// user
import {
  FiPackage,
  FiTruck,
  FiRefreshCw,
  FiShield,
  FiCamera,
} from "react-icons/fi";
import decorImage from "../../assets/image2.jpg";
import StatsStrip from "./StatsStrip";

/*
  WhyChooseUs
  - التصميم الأصلي مبني بشبكة 3 أعمدة × صفين (عرض ديسكتوب 705px) - على
    عرض موبايل هالشبكة بتحشر النص وتخليه ينكسر بشكل قبيح، فحولتها لقائمة
    مرصوصة عموديًا (نفس بنية كل عنصر: أيقونة فوق العنوان فوق النص الفرعي)

  - تصحيح مهم: الصورة مش بانر منفصل عن المحتوى - هي خلفية مستمرة والعنوان
    + أول عنصر عايشين فوقها مباشرة (زي الـ Hero بالضبط). حطيت العنوان
    وأول Feature بس داخل منطقة الصورة (why-us-hero-zone)، والباقي (4
    عناصر) بيكمل تحتها على خلفية عادية - نفس التوازن يلي بالتصميم الأصلي
    (الصورة أصلاً كانت تغطي الصف الأول بس، مش القسم كامل)
*/
const FEATURES = [
  {
    icon: FiPackage,
    title: "قطعة واحدة فقط",
    text: "كل قطعة فريدة ومتوفرة مرة واحدة فقط",
  },
  {
    icon: FiTruck,
    title: "شحن سريع وآمن",
    text: "توصيل سريع وتغليف أنيق",
  },
  {
    icon: FiRefreshCw,
    title: "إرجاع سهل",
    text: "إمكانية الإرجاع خلال ٧ أيام",
  },
  {
    icon: FiShield,
    title: "فحص الجودة",
    text: "كل قطعة تفحص بعناية قبل الشحن",
  },
  {
    icon: FiCamera,
    title: "صورة حقيقية ١٠٠٪",
    text: "جميع الصور ملتقطة من فريقنا",
  },
];

const FeatureItem = ({ icon: Icon, title, text }) => (
  <div className="why-us-item">
    <span className="why-us-icon">
      <Icon />
    </span>
    <h3 className="why-us-item-title">{title}</h3>
    <p className="why-us-item-text">{text}</p>
  </div>
);

const WhyChooseUs = () => {
  const [firstFeature, ...restFeatures] = FEATURES;

  return (
    <section className="why-us">
      <div
        className="why-us-hero-zone"
        style={{ backgroundImage: `url(${decorImage})` }}
      >
        <h2 className="why-us-title">قطعة استثنائية... بجودة تستحق الثقة</h2>
        <div className="why-us-box">
          <FeatureItem {...firstFeature} />
          {restFeatures.map((feature) => (
            <FeatureItem key={feature.title} {...feature} />
          ))}
        </div>
      </div>

      {/* <div className="why-us-list">
        {restFeatures.map((feature) => (
          <FeatureItem key={feature.title} {...feature} />
        ))}
      </div> */}

      <StatsStrip />
    </section>
  );
};

export default WhyChooseUs;

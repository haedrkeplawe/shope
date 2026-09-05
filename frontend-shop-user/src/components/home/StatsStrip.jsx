// user
import { FiSmile, FiStar, FiTrendingUp, FiShoppingBag } from "react-icons/fi";

/*
  StatsStrip
  - شريط إحصائيات ثقة (عدد العملاء/التقييم/تحديث أسبوعي/عدد المبيعات)
  - نفس تقنية trust-badges بالـ Hero: شبكة direction:ltr بترتيب DOM
    الطبيعي (القراءة يسار-يمين متل التصميم)، وكل عنصر dir="rtl" لحاله
  - محتوى ثابت شكليًا حاليًا (مفيش endpoint فعلي يجيب أرقام حقيقية)
*/
const STATS = [
  { icon: FiSmile, big: "+1500", small: "عميل سعيد" },
  { icon: FiStar, big: "4.9 / 5", small: "متوسط التقييمات" },
  { icon: FiTrendingUp, big: "جديد كل أسبوع", small: "قطعة جديدة تنتظرك" },
  { icon: FiShoppingBag, big: "+3200", small: "قطعة مباعة" },
];

const StatsStrip = () => {
  return (
    <div className="stats-strip">
      {STATS.map(({ icon: Icon, big, small }) => (
        <div className="stats-strip-item" dir="rtl" key={small}>
          <span className="stats-strip-icon">
            <Icon />
          </span>
          <div className="stats-strip-text">
            <span className="stats-strip-big">{big}</span>
            <span className="stats-strip-small">{small}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsStrip;

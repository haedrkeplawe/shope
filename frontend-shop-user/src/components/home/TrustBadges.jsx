// user
import React from "react";
import { FiTruck, FiShield, FiRotateCcw, FiLock } from "react-icons/fi";

/*
  TrustBadges
  - شريط شارات الثقة (شحن مجاني/ضمان الأصالة/إرجاع/دفع آمن) - محتوى ثابت
    شكليًا حاليًا، مفيش بيانات ديناميكية وراه (نص وأرقام وشروط ثابتة)
  - ترتيب DOM هون بالقراءة الطبيعية (أعلى-يسار، أعلى-يمين، تحت-يسار،
    تحت-يمين) مع Grid بـdirection: ltr بس لترتيب الخلايا، وكل عنصر
    لحاله dir="rtl" عشان نص العربي يترتب صح جوّاته - أبسط وأوضح من
    محاولة قلب ترتيب الـ DOM يدويًا داخل شبكة RTL
*/
const BADGES = [
  { icon: FiTruck, text: "شحن مجاني فوق ٥٠٠ ر.س" },
  { icon: FiShield, text: "فحص ضمان الأصالة" },
  { icon: FiLock, text: "دفع آمن ومشفّر" },
  { icon: FiRotateCcw, text: "إرجاع ١٤ يوم" },
];

const TrustBadges = () => {
  return (
    <div className="trust-badges">
      {BADGES.map(({ icon: Icon, text }) => (
        <div className="trust-badge" dir="rtl" key={text}>
          <span>{text}</span>
          <Icon className="trust-badge-icon" />
        </div>
      ))}
    </div>
  );
};

export default TrustBadges;

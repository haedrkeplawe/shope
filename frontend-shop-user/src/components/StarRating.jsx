// user
import { useState } from "react";
import { FaStar } from "react-icons/fa";

/*
  StarRating (ودجت النجوم القابلة لإعادة الاستخدام)
  - وضعين:
    1) عرض بس (interactive=false، الافتراضي): بيرسم value كنجوم/أنصاف
       نجوم بس، بدون أي تفاعل - مستخدم لعرض متوسط تقييمات المنتج
    2) تفاعلي (interactive=true): كل نجمة مقسومة لنصفين (يمين/شمال) -
       الزبون بيضغط على النصف الأول من النجمة ليعطي X.5 (نص نجمة)، أو
       النصف الثاني ليعطي X كاملة - مستخدم بودجت "قيّم هاي القطعة"

  ⚠️ حساب النصف مبني على موقع الضغط الفعلي داخل حدود أيقونة النجمة نفسها
  (getBoundingClientRect + clientX)، مش على اتجاه الصفحة (RTL/LTR) - فبيشتغل
  صح تمامًا بغض النظر عن اتجاه الموقع العام (كل نجمة بتحسب حالها لحالها)
*/
const StarRating = ({
  value = 0,
  onChange,
  interactive = false,
  size = 20,
  disabled = false,
}) => {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = interactive && hoverValue !== null ? hoverValue : value;

  const valueFromClick = (e, starIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isHalf = clickX < rect.width / 2;
    return isHalf ? starIndex - 0.5 : starIndex;
  };

  const handlePick = (e, starIndex) => {
    if (!interactive || disabled) return;
    onChange?.(valueFromClick(e, starIndex));
  };

  const handleHover = (e, starIndex) => {
    if (!interactive || disabled) return;
    setHoverValue(valueFromClick(e, starIndex));
  };

  return (
    <div
      className={`star-rating${interactive ? " star-rating--interactive" : ""}${
        disabled ? " star-rating--disabled" : ""
      }`}
      onMouseLeave={() => interactive && setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillPercent =
          Math.max(0, Math.min(1, displayValue - (starIndex - 1))) * 100;

        return (
          <span
            key={starIndex}
            className="star-slot"
            style={{ width: size, height: size }}
            onClick={(e) => handlePick(e, starIndex)}
            onMouseMove={(e) => handleHover(e, starIndex)}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `${starIndex} نجوم` : undefined}
          >
            <FaStar size={size} className="star-bg" />
            <span className="star-fill" style={{ width: `${fillPercent}%` }}>
              <FaStar size={size} className="star-fg" />
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;

import React from "react";
import { FiArrowUp, FiArrowDown, FiChevronLeft } from "react-icons/fi";

/*
  DashboardStatCard
  ------------------------------------------------------------------
  كارت إحصائية خاص بصفحة "لوحة التحكم" الرئيسية بس - شكل مختلف عن
  StatCard العام (المستخدم بباقي الصفحات): شارة نسبة التغيّر (بخلفية
  فاتحة) + أيقونة كبيرة بنفس الصف، ثم الرقم والوصف، وأخيرًا رابط "عرض
  التفاصيل" بيودّي لصفحة التفاصيل المرتبطة (لو موجودة).

  ⚠️ ملاحظة RTL مهمة: الصفحة كلها dir="rtl" (من DashboardLayout)، فداخل
  أي flex-direction:row، أول عنصر بالـ DOM بيترسم على اليمين مش الشمال.
  عشان الأيقونة تظهر يمين والشارة شمال (نفس التصميم بالضبط)، لازم
  الأيقونة تكون أول عنصر بالـ JSX، وبعدها الشارة - مش العكس

  ⚠️ كارت منفصل (مش تعديل على StatCard.jsx المشترك) عن قصد - StatCard
  مستخدم بأكتر من 6 صفحات تانية بشكل مختلف شكليًا، وتعديله كان راح
  يأثر عليهم كلهم لغرض غير مطلوب منهم أصلاً

  trend: { value, isPercent } - isPercent (افتراضي true) بيتحكم إذا كان
  الرقم بالشارة بيتعرض كنسبة مئوية ("12.5%") أو كفرق خام بإشارة
  ("+0.2"/"-0.2") - مستخدمة لكارت "التقييم العام" يلي بيعرض فرق نقاط
  مش نسبة (شوف dashboard.controller.js → makeStat)

  onDetailsClick: اختياري - لو مو ممرّر، رابط "عرض التفاصيل" ما بيظهر
*/
const DashboardStatCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
  onDetailsClick,
}) => {
  const isPositive = trend?.value >= 0;
  const isPercent = trend?.isPercent !== false;

  const trendText = isPercent
    ? `${Math.abs(trend?.value ?? 0)}%`
    : `${isPositive ? "+" : "-"}${Math.abs(trend?.value ?? 0)}`;

  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-card-top">
        <div
          className="dashboard-stat-card-icon"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon />
        </div>

        {trend && (
          <span
            className={`dashboard-stat-card-trend ${
              isPositive
                ? "dashboard-stat-card-trend--up"
                : "dashboard-stat-card-trend--down"
            }`}
          >
            {isPositive ? <FiArrowUp /> : <FiArrowDown />}
            {trendText}
          </span>
        )}
      </div>

      <span className="dashboard-stat-card-value">{value}</span>
      <span className="dashboard-stat-card-label">{label}</span>

      {onDetailsClick && (
        <button
          type="button"
          className="dashboard-stat-card-details"
          onClick={onDetailsClick}
        >
          عرض التفاصيل
          <FiChevronLeft />
        </button>
      )}
    </div>
  );
};

export default DashboardStatCard;

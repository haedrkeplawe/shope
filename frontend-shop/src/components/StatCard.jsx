import React from "react";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

/*
  StatCard
  - كارت إحصائية بسيط: أيقونة + رقم + وصف
  - الألوان (iconBg / iconColor) بتتحدد من الصفحة اللي بتستخدمه، لأنها مختلفة لكل كارت
  - trend (اختياري): { value, positive } - نسبة تغيّر مقارنة بفترة سابقة
    (مستخدمة بصفحة التقارير) - لو ما تم تمريرها، الكارت بيترسم بالضبط
    زي ما كان قبل هيك (بدون أي تغيير على باقي الصفحات المستخدمة له)
*/
const StatCard = ({ icon: Icon, iconBg, iconColor, value, label, trend }) => {
  return (
    <div className="stat-card">
      <div
        className="stat-card-icon"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon />
      </div>
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
      {trend && (
        <span
          className={`stat-card-trend ${
            trend.positive ? "stat-card-trend--up" : "stat-card-trend--down"
          }`}
        >
          {trend.positive ? <FiArrowUp /> : <FiArrowDown />}
          {Math.abs(trend.value)}% {trend.suffix || "من الفترة السابقة"}
        </span>
      )}
    </div>
  );
};

export default StatCard;

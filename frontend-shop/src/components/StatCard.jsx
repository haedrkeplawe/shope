import React from "react";

/*
  StatCard
  - كارت إحصائية بسيط: أيقونة + رقم + وصف
  - الألوان (iconBg / iconColor) بتتحدد من الصفحة اللي بتستخدمه، لأنها مختلفة لكل كارت
*/
const StatCard = ({ icon: Icon, iconBg, iconColor, value, label }) => {
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
    </div>
  );
};

export default StatCard;

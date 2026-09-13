import React from "react";

/*
  StatusTabs
  - شريط تبويبات فلترة عام قابل لإعادة الاستخدام (حالة الطلب، حالة
    موافقة التقييم...) - كل تبويب بيعرض تسميته + عدّاده
  - tabs: [{ value, label, count }]
  - activeValue / onChange: التحكم بالتبويب المفعّل حاليًا
*/
const StatusTabs = ({ tabs, activeValue, onChange }) => {
  return (
    <div className="status-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`status-tab ${
            activeValue === tab.value ? "status-tab--active" : ""
          }`}
          onClick={() => onChange(tab.value)}
        >
          <span className="status-tab-label">{tab.label}</span>
          <span className="status-tab-count">{tab.count ?? 0}</span>
        </button>
      ))}
    </div>
  );
};

export default StatusTabs;

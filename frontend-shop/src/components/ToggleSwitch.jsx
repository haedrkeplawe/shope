import React from "react";

/*
  ToggleSwitch
  - مفتاح تبديل بسيط قابل لإعادة الاستخدام في أي مكان بالمشروع
*/
const ToggleSwitch = ({ checked, onChange }) => {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-switch-slider" />
    </label>
  );
};

export default ToggleSwitch;

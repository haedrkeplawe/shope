import React, { useState } from "react";
import { FiX, FiCheck } from "react-icons/fi";

/*
  ReportPeriodModal
  - مودال اختيار الفترة الزمنية لصفحة التقارير - 5 فترات جاهزة + خيار
    "مخصص" بيفتح حقلين تاريخ (من/إلى)
  - onApply(period, from, to): بتتنادى بس لما الأدمن يضغط "تطبيق"
*/
const PERIOD_OPTIONS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "quarter", label: "آخر 3 أشهر" },
  { value: "year", label: "هذه السنة" },
  { value: "custom", label: "مخصص" },
];

const ReportPeriodModal = ({
  currentPeriod,
  currentFrom,
  currentTo,
  onClose,
  onApply,
}) => {
  const [period, setPeriod] = useState(currentPeriod);
  const [fromDate, setFromDate] = useState(currentFrom || "");
  const [toDate, setToDate] = useState(currentTo || "");

  const handleApply = () => {
    if (period === "custom" && (!fromDate || !toDate)) {
      return;
    }
    onApply({ period, from: fromDate, to: toDate });
    onClose();
  };

  return (
    <div className="advanced-filter-modal-overlay" onClick={onClose}>
      <div
        className="advanced-filter-modal report-period-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="advanced-filter-modal-header">
          <h3>تخصيص الفترة الزمنية</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="advanced-filter-modal-body">
          <div className="report-period-options-grid">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`report-period-option ${
                  period === opt.value ? "report-period-option--active" : ""
                }`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="report-period-custom-dates">
              <div className="category-form-group">
                <label>من تاريخ</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="category-form-group">
                <label>إلى تاريخ</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="report-period-actions">
            <button
              type="button"
              className="report-period-apply-btn"
              onClick={handleApply}
            >
              <FiCheck />
              تطبيق
            </button>
            <button
              type="button"
              className="report-period-cancel-btn"
              onClick={onClose}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPeriodModal;

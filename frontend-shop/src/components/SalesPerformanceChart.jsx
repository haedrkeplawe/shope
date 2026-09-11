import React, { useMemo, useState } from "react";

/*
  SalesPerformanceChart
  ------------------------------------------------------------------
  كارت "أداء المبيعات" بصفحة "لوحة التحكم" الرئيسية - رسم خط ناعم
  (Smooth Line + Area) مرسوم يدويًا بـ SVG (بدون أي مكتبة رسم بيانات
  خارجية، نفس أسلوب reports.css/Reports.jsx بالضبط) يقارن إجمالي
  المبيعات بالفترة الحالية (خط معبّى) مقابل الفترة السابقة المكافئة لها
  بنفس الطول تمامًا (خط متقطع فاتح) - القيم جايّة جاهزة من
  dashboard.controller.js → getSalesPerformance

  PERIOD_TABS: نفس الفترات الخمسة المستخدمة بالتصميم الأصلي - "هذا
  الشهر" هون شهر تقويمي فعلي (من أول يوم بالشهر لليوم) مختلف عن "آخر 30
  يوم" (نافذة متدحرجة) - الاثنين مفيدين بمعنى مختلف فعلاً، مش تكرار
*/
const PERIOD_TABS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "آخر 7 أيام" },
  { value: "month", label: "آخر 30 يوم" },
  { value: "thisMonth", label: "هذا الشهر" },
  { value: "custom", label: "فترة مخصصة" },
];

const CHART_WIDTH = 700;
const CHART_HEIGHT = 230;
const PADDING_X = 6;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 30;
const Y_TICKS = 4; // 5 خطوط أفقية (4 فراغات + الصفر)

/*
  بيبني مسار SVG ناعم (منحنى) يمر بكل النقاط عن طريق تحويلها لأقواس
  Bezier تكعيبية متتالية (نسخة مبسّطة من Catmull-Rom spline) - بدون أي
  مكتبة خارجية، رياضيات بسيطة بس
*/
const buildSmoothPath = (points) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

const buildPoints = (values, maxValue) => {
  const count = values.length;
  const usableWidth = CHART_WIDTH - PADDING_X * 2;
  const usableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  return values.map((v, i) => {
    const x =
      count === 1
        ? CHART_WIDTH / 2
        : PADDING_X + (i / (count - 1)) * usableWidth;
    const ratio = maxValue > 0 ? v / maxValue : 0;
    const y = PADDING_TOP + (1 - ratio) * usableHeight;
    return { x, y };
  });
};

/* تنسيق مختصر للقيم على المحور الرأسي - نفس أسلوب "k" المستخدم أصلاً
   بمخطط "نمو المبيعات" بصفحة التقارير (Reports.jsx) */
const formatAxisValue = (value) => {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return Math.round(value).toLocaleString("en-US");
};

const SalesPerformanceChart = ({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomDatesChange,
  data,
  loading,
}) => {
  const [pendingFrom, setPendingFrom] = useState(customFrom || "");
  const [pendingTo, setPendingTo] = useState(customTo || "");

  const { labels = [], current = [], previous = [] } = data || {};

  const maxValue = useMemo(
    () => Math.max(1, ...current, ...previous),
    [current, previous],
  );

  const currentPoints = useMemo(
    () => buildPoints(current, maxValue),
    [current, maxValue],
  );
  const previousPoints = useMemo(
    () => buildPoints(previous, maxValue),
    [previous, maxValue],
  );

  const currentLinePath = buildSmoothPath(currentPoints);
  const previousLinePath = buildSmoothPath(previousPoints);
  const areaPath =
    currentPoints.length > 0
      ? `${currentLinePath} L ${currentPoints[currentPoints.length - 1].x} ${
          CHART_HEIGHT - PADDING_BOTTOM
        } L ${currentPoints[0].x} ${CHART_HEIGHT - PADDING_BOTTOM} Z`
      : "";

  // خطوط أفقية خفيفة + قيم المحور الرأسي (من الأعلى للأسفل: أعلى قيمة → صفر)
  const usableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => {
    const ratio = i / Y_TICKS;
    return {
      y: PADDING_TOP + ratio * usableHeight,
      value: maxValue * (1 - ratio),
    };
  });

  const handleApplyCustom = () => {
    if (!pendingFrom || !pendingTo) return;
    onCustomDatesChange(pendingFrom, pendingTo);
  };

  return (
    <div className="dashboard-sales-card">
      <div className="dashboard-sales-header">
        <div>
          <h3 className="dashboard-sales-title">أداء المبيعات</h3>
          <p className="dashboard-sales-subtitle">
            مقارنة الفترة الحالية بالسابقة
          </p>
        </div>

        <div className="dashboard-sales-tabs-group">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`dashboard-sales-tab ${
                period === tab.value ? "dashboard-sales-tab--active" : ""
              }`}
              onClick={() => onPeriodChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-sales-legend">
        <span className="dashboard-sales-legend-item">
          <span className="dashboard-sales-legend-line dashboard-sales-legend-line--prev" />
          الفترة السابقة
        </span>
        <span className="dashboard-sales-legend-item">
          <span className="dashboard-sales-legend-line dashboard-sales-legend-line--current" />
          هذه الفترة
        </span>
      </div>

      {period === "custom" && (
        <div className="dashboard-sales-custom-dates">
          <input
            type="date"
            value={pendingFrom}
            onChange={(e) => setPendingFrom(e.target.value)}
          />
          <span>إلى</span>
          <input
            type="date"
            value={pendingTo}
            onChange={(e) => setPendingTo(e.target.value)}
          />
          <button
            type="button"
            className="dashboard-sales-custom-apply"
            onClick={handleApplyCustom}
          >
            تطبيق
          </button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-sales-loading">جاري تحميل الرسم...</div>
      ) : current.length === 0 ? (
        <p className="reports-empty-note">لا توجد بيانات مبيعات بهذه الفترة</p>
      ) : (
        <div className="dashboard-sales-chart-wrapper">
          <div className="dashboard-sales-y-axis">
            {yTicks.map((tick) => (
              <span key={tick.y}>{formatAxisValue(tick.value)}</span>
            ))}
          </div>

          <div className="dashboard-sales-chart-main">
            <svg
              className="dashboard-sales-chart"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="dashboardSalesFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--primary-color)"
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary-color)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {yTicks.map((tick) => (
                <line
                  key={tick.y}
                  x1={PADDING_X}
                  y1={tick.y}
                  x2={CHART_WIDTH - PADDING_X}
                  y2={tick.y}
                  stroke="var(--border-color)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {areaPath && (
                <path d={areaPath} fill="url(#dashboardSalesFill)" />
              )}

              {previousLinePath && (
                <path
                  d={previousLinePath}
                  fill="none"
                  stroke="var(--border-color)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              )}

              {currentLinePath && (
                <path
                  d={currentLinePath}
                  fill="none"
                  stroke="var(--primary-color)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
            </svg>

            <div className="dashboard-sales-x-axis">
              {labels.map((label, i) => (
                <span key={`${label}-${i}`}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPerformanceChart;

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiDownload,
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
  FiImage,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import StatCard from "../components/StatCard";
import ReportPeriodModal from "../components/ReportPeriodModal";

/*
  Reports (التقارير والتحليلات)
  ------------------------------------------------------------------
  - كروت الإحصائيات الأربعة + توزيع المبيعات حسب الفئة + أفضل العملاء
    والمنتجات الأكثر مبيعًا: كلهم محسوبين حسب الفترة الزمنية المختارة
  - "نمو المبيعات" (آخر 6 شهور): رسم مستقل عن الفترة المختارة عن قصد -
    شوف الشرح بالتفصيل في controllers/report.controller.js
  - كل الرسومات هون SVG/CSS يدوي (بدون أي مكتبة رسم بيانات خارجية) -
    نفس أسلوب باقي المشروع بالكامل

  PERIOD_LABELS: نفس قيم PERIOD_OPTIONS بمودال ReportPeriodModal
*/
const PERIOD_LABELS = {
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  quarter: "آخر 3 أشهر",
  year: "هذه السنة",
  custom: "فترة مخصصة",
};

// ألوان متكررة لأجزاء دائرة "المبيعات حسب الفئة" - بترجع بالدور لو الفئات أكتر من الألوان
const CATEGORY_COLORS = [
  "#8f2f41",
  "#8b5cf6",
  "#eab308",
  "#14b8a6",
  "#3b82f6",
  "#ec4899",
];

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }

      const res = await fetch(
        `${API_URL}/admin/reports/overview?${params.toString()}`,
        { credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات التقرير");
        return;
      }

      setData(result);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleApplyPeriod = ({ period: newPeriod, from, to }) => {
    setPeriod(newPeriod);
    setCustomFrom(from || "");
    setCustomTo(to || "");
  };

  const handleExport = () => {
    if (!data) return;

    const { stats, salesByCategory, topCustomers, topProducts } = data;
    const rows = [
      ["تقرير الأداء", PERIOD_LABELS[period] || period],
      [],
      ["المؤشر", "القيمة", "نسبة التغيّر"],
      [
        "متوسط قيمة الطلب",
        stats.avgOrderValue.value,
        `${stats.avgOrderValue.changePercent}%`,
      ],
      [
        "عملاء جدد",
        stats.newCustomers.value,
        `${stats.newCustomers.changePercent}%`,
      ],
      [
        "عدد الطلبيات",
        stats.ordersCount.value,
        `${stats.ordersCount.changePercent}%`,
      ],
      [
        "إجمالي الإيرادات",
        stats.totalRevenue.value,
        `${stats.totalRevenue.changePercent}%`,
      ],
      [],
      ["المبيعات حسب الفئة"],
      ["الفئة", "الإيرادات", "النسبة"],
      ...salesByCategory.map((c) => [c.name, c.revenue, `${c.percent}%`]),
      [],
      ["أفضل العملاء"],
      ["الاسم", "الهاتف", "إجمالي الإنفاق", "عدد الطلبات"],
      ...topCustomers.map((c) => [
        c.fullName,
        c.phone,
        c.totalSpent,
        c.ordersCount,
      ]),
      [],
      ["المنتجات الأكثر مبيعًا"],
      ["المنتج", "الكمية المباعة", "الإيرادات"],
      ...topProducts.map((p) => [p.name, p.quantitySold, p.revenue]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تقرير-الأداء-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!data) return null;

  const { stats, salesByCategory, salesGrowth, topCustomers, topProducts } =
    data;

  // بناء تدرّج الدائرة (conic-gradient) لتوزيع المبيعات حسب الفئة
  let cumulativePercent = 0;
  const gradientStops = salesByCategory.map((cat, index) => {
    const start = cumulativePercent;
    cumulativePercent += cat.percent;
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    return `${color} ${start}% ${cumulativePercent}%`;
  });
  const donutBackground =
    gradientStops.length > 0
      ? `conic-gradient(${gradientStops.join(", ")})`
      : "var(--border-color)";

  const maxGrowthValue = Math.max(1, ...salesGrowth.map((m) => m.value));

  return (
    <div className="reports-page">
      {/* الهيدر */}
      <div className="reports-header">
        <div>
          <h1 className="reports-title">التقارير والتحليلات</h1>
          <p className="reports-subtitle">تقارير مفصلة عن أداء المتجر</p>
        </div>
        <div className="reports-header-actions">
          <button
            type="button"
            className="reports-period-btn"
            onClick={() => setShowPeriodModal(true)}
          >
            <FiCalendar />
            {PERIOD_LABELS[period] || "تخصيص الفترة"}
          </button>
          <button
            type="button"
            className="reports-export-btn"
            onClick={handleExport}
          >
            <FiDownload />
            تصدير التقرير
          </button>
        </div>
      </div>

      {/* كروت الإحصائيات */}
      <div className="reports-stats-grid">
        <StatCard
          icon={FiDollarSign}
          iconBg="#fdead1"
          iconColor="#c9820a"
          value={`${stats.avgOrderValue.value.toLocaleString("en-US")} ل.س`}
          label="متوسط قيمة الطلب"
          trend={{
            value: stats.avgOrderValue.changePercent,
            positive: stats.avgOrderValue.changePercent >= 0,
          }}
        />
        <StatCard
          icon={FiUsers}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={stats.newCustomers.value}
          label="عملاء جدد"
          trend={{
            value: stats.newCustomers.changePercent,
            positive: stats.newCustomers.changePercent >= 0,
          }}
        />
        <StatCard
          icon={FiShoppingBag}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.ordersCount.value.toLocaleString("en-US")}
          label="عدد الطلبيات"
          trend={{
            value: stats.ordersCount.changePercent,
            positive: stats.ordersCount.changePercent >= 0,
          }}
        />
        <StatCard
          icon={FiTrendingUp}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          value={`${stats.totalRevenue.value.toLocaleString("en-US")} ل.س`}
          label="إجمالي الإيرادات"
          trend={{
            value: stats.totalRevenue.changePercent,
            positive: stats.totalRevenue.changePercent >= 0,
          }}
        />
      </div>

      {/* المبيعات حسب الفئة + نمو المبيعات */}
      <div className="reports-charts-row">
        <div className="reports-card">
          <h3 className="reports-card-title">المبيعات حسب الفئة</h3>
          {salesByCategory.length === 0 ? (
            <p className="reports-empty-note">لا توجد مبيعات بهذه الفترة</p>
          ) : (
            <div className="reports-donut-wrapper">
              <div
                className="reports-donut"
                style={{ background: donutBackground }}
              />
              <div className="reports-donut-legend">
                {salesByCategory.map((cat, index) => (
                  <div className="reports-legend-row" key={cat.name}>
                    <span
                      className="reports-legend-dot"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      }}
                    />
                    <span className="reports-legend-label">{cat.name}</span>
                    <span className="reports-legend-percent">
                      {cat.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="reports-card">
          <h3 className="reports-card-title">نمو المبيعات (آخر 6 شهور)</h3>
          <div className="reports-bar-chart">
            {salesGrowth.map((m) => (
              <div className="reports-bar-col" key={m.label}>
                <span className="reports-bar-value">
                  {m.value > 0 ? `${Math.round(m.value / 1000)}k` : ""}
                </span>
                <div className="reports-bar-track">
                  <div
                    className="reports-bar-fill"
                    style={{
                      height: `${Math.max(
                        4,
                        (m.value / maxGrowthValue) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="reports-bar-label">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* أفضل العملاء + المنتجات الأكثر مبيعًا */}
      <div className="reports-charts-row">
        <div className="reports-card">
          <h3 className="reports-card-title">أفضل العملاء</h3>
          {topCustomers.length === 0 ? (
            <p className="reports-empty-note">لا يوجد عملاء بهذه الفترة</p>
          ) : (
            <div className="reports-list">
              {topCustomers.map((c, index) => (
                <div className="reports-list-row" key={c.id}>
                  <span className="reports-list-rank">{index + 1}</span>
                  <span className="reports-list-avatar">
                    {c.fullName.charAt(0)}
                  </span>
                  <div className="reports-list-info">
                    <span className="reports-list-name">{c.fullName}</span>
                    <span className="reports-list-sub">
                      {c.ordersCount} طلب
                    </span>
                  </div>
                  <span className="reports-list-value">
                    {c.totalSpent.toLocaleString("en-US")} ل.س
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="reports-card">
          <h3 className="reports-card-title">المنتجات الأكثر مبيعًا</h3>
          {topProducts.length === 0 ? (
            <p className="reports-empty-note">لا توجد مبيعات بهذه الفترة</p>
          ) : (
            <div className="reports-list">
              {topProducts.map((p, index) => (
                <div className="reports-list-row" key={p.id}>
                  <span className="reports-list-rank">{index + 1}</span>
                  <span className="reports-list-thumb">
                    {p.image ? (
                      <img src={getImageUrl(p.image)} alt={p.name} />
                    ) : (
                      <FiImage />
                    )}
                  </span>
                  <div className="reports-list-info">
                    <span className="reports-list-name">{p.name}</span>
                    <span className="reports-list-sub">
                      {p.quantitySold} عملية شراء
                    </span>
                  </div>
                  <span className="reports-list-value">
                    {p.revenue.toLocaleString("en-US")} ل.س
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPeriodModal && (
        <ReportPeriodModal
          currentPeriod={period}
          currentFrom={customFrom}
          currentTo={customTo}
          onClose={() => setShowPeriodModal(false)}
          onApply={handleApplyPeriod}
        />
      )}
    </div>
  );
};

export default Reports;

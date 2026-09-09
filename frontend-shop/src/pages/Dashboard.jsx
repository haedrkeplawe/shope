import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiCheckCircle,
  FiBox,
  FiBarChart2,
  FiShoppingBag,
  FiDollarSign,
  FiStar,
  FiShoppingCart,
  FiAward,
  FiShare2,
  FiUserPlus,
  FiImage,
  FiHeart,
  FiEye,
  FiChevronLeft,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatFullDate, formatRelativeTime } from "../utils/formatDate";
import { getOrderStatusBadge } from "../utils/orderStatus";
import { getProductStatusBadge } from "../utils/productStatus";
import DashboardStatCard from "../components/DashboardStatCard";
import SalesPerformanceChart from "../components/SalesPerformanceChart";

/*
  Dashboard (لوحة التحكم - الصفحة الرئيسية)
  ------------------------------------------------------------------
  أول صفحة يشوفها الأدمن لحظة الدخول - نظرة عامة سريعة وشاملة على أداء
  المتجر: 10 كروت إحصائية + رسم "أداء المبيعات" التفاعلي (فترة قابلة
  للتبديل) + "أحدث الطلبات" + "المنتجات الأكثر مشاهدة"

  ⚠️ كارتي "الأعضاء المشتركون" و"أرباح التسويق بالعمولة" أرقام ثابتة
  حاليًا (جايّة جاهزة كذا من الباك إند) - نظاميهم لسه ما اتبنوا بالسستم،
  شوف الشرح الكامل بـ controllers/dashboard.controller.js

  كل كارت إحصائية بيرجع من الباك إند بالشكل { value, change,
  changeIsPercent } - changeIsPercent بيتحكم هل الشارة بتعرض "12.5%"
  أو فرق خام بإشارة زي "+0.2" (مستخدمة لكارت "التقييم العام" بس حاليًا)

  كروت الإحصائيات مبنية على نافذة 30 يوم متدحرجة ثابتة (بدون فلتر فترة
  بالواجهة) - بعكس رسم "أداء المبيعات" يلي له فلتر فترة مستقل خاص فيه
*/
const Dashboard = () => {
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [salesPeriod, setSalesPeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [salesData, setSalesData] = useState(null);
  const [loadingSales, setLoadingSales] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`${API_URL}/admin/dashboard/overview`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات لوحة التحكم");
        return;
      }

      setOverview(result);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchSalesPerformance = useCallback(async () => {
    if (salesPeriod === "custom" && (!customFrom || !customTo)) return;

    setLoadingSales(true);
    try {
      const params = new URLSearchParams({ period: salesPeriod });
      if (salesPeriod === "custom") {
        params.set("from", customFrom);
        params.set("to", customTo);
      }

      const res = await fetch(
        `${API_URL}/admin/dashboard/sales-performance?${params.toString()}`,
        { credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل رسم أداء المبيعات");
        return;
      }

      setSalesData(result);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoadingSales(false);
    }
  }, [salesPeriod, customFrom, customTo]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchSalesPerformance();
  }, [fetchSalesPerformance]);

  const handleCustomDatesChange = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
  };

  // نص نسبة/فرق التغيّر لتصدير الـ CSV - نفس منطق DashboardStatCard بالضبط
  const formatChange = (stat) =>
    stat.changeIsPercent
      ? `${stat.change}%`
      : `${stat.change >= 0 ? "+" : ""}${stat.change}`;

  const handleExport = () => {
    if (!overview) return;

    const { stats, recentOrders, topProducts } = overview;
    const rows = [
      ["لوحة التحكم", formatFullDate(new Date())],
      [],
      ["المؤشر", "القيمة", "نسبة/فرق التغيّر"],
      ["القطع المباعة", stats.piecesSold.value, formatChange(stats.piecesSold)],
      [
        "القطع المتاحة للبيع",
        stats.availableProducts.value,
        formatChange(stats.availableProducts),
      ],
      [
        "متوسط قيمة الطلب",
        stats.avgOrderValue.value,
        formatChange(stats.avgOrderValue),
      ],
      [
        "عدد الطلبيات",
        stats.ordersCount.value,
        formatChange(stats.ordersCount),
      ],
      [
        "إجمالي المبيعات",
        stats.totalRevenue.value,
        formatChange(stats.totalRevenue),
      ],
      [
        "متوسط التقييم العام",
        stats.storeRating.value,
        formatChange(stats.storeRating),
      ],
      [
        "السلات المتروكة",
        stats.abandonedCarts.value,
        formatChange(stats.abandonedCarts),
      ],
      [
        "الأعضاء المشتركون",
        stats.subscribedMembers.value,
        formatChange(stats.subscribedMembers),
      ],
      ["عملاء جدد", stats.newCustomers.value, formatChange(stats.newCustomers)],
      [
        "أرباح التسويق بالعمولة",
        stats.affiliateProfit.value,
        formatChange(stats.affiliateProfit),
      ],
      [],
      ["أحدث الطلبات"],
      ["رقم الطلب", "العميل", "قيمة الطلب", "الحالة"],
      ...recentOrders.map((o) => [
        o.orderNumber,
        o.customer?.fullName || "زبون محذوف",
        o.grandTotal,
        getOrderStatusBadge(o.status).label,
      ]),
      [],
      ["المنتجات الأكثر مشاهدة"],
      ["المنتج", "المشاهدات", "المفضلة", "أضيف للسلة"],
      ...topProducts.map((p) => [
        p.name,
        p.viewsCount,
        p.favoritesCount,
        p.cartAddsCount,
      ]),
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
    link.download = `لوحة-التحكم-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadingOverview && !overview) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!overview) return null;

  const { stats, recentOrders, topProducts } = overview;

  return (
    <div className="dashboard-home-page">
      {/* الهيدر */}
      <div className="dashboard-home-header">
        <div>
          <h1 className="dashboard-home-title">لوحة التحكم</h1>
          <p className="dashboard-home-subtitle">
            {formatFullDate(new Date())}
          </p>
        </div>
        <button
          type="button"
          className="reports-export-btn"
          onClick={handleExport}
        >
          <FiDownload />
          تصدير التقرير
        </button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="dashboard-home-stats-grid">
        <DashboardStatCard
          icon={FiCheckCircle}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          value={stats.piecesSold.value.toLocaleString("en-US")}
          label="القطع المباعة"
          trend={{
            value: stats.piecesSold.change,
            isPercent: stats.piecesSold.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/reports")}
        />
        <DashboardStatCard
          icon={FiBox}
          iconBg="#fdead1"
          iconColor="#c9820a"
          value={stats.availableProducts.value.toLocaleString("en-US")}
          label="القطع المتاحة للبيع"
          trend={{
            value: stats.availableProducts.change,
            isPercent: stats.availableProducts.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/inventory")}
        />
        <DashboardStatCard
          icon={FiBarChart2}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={`${stats.avgOrderValue.value.toLocaleString("en-US")} ل.س`}
          label="متوسط قيمة الطلب"
          trend={{
            value: stats.avgOrderValue.change,
            isPercent: stats.avgOrderValue.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/reports")}
        />
        <DashboardStatCard
          icon={FiShoppingBag}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.ordersCount.value.toLocaleString("en-US")}
          label="عدد الطلبيات"
          trend={{
            value: stats.ordersCount.change,
            isPercent: stats.ordersCount.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/orders")}
        />
        <DashboardStatCard
          icon={FiDollarSign}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          value={`${stats.totalRevenue.value.toLocaleString("en-US")} ل.س`}
          label="إجمالي المبيعات"
          trend={{
            value: stats.totalRevenue.change,
            isPercent: stats.totalRevenue.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/reports")}
        />
        <DashboardStatCard
          icon={FiStar}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={`${stats.storeRating.value} / 5`}
          label="التقييم العام للمتجر"
          trend={{
            value: stats.storeRating.change,
            isPercent: stats.storeRating.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/reviews")}
        />
        <DashboardStatCard
          icon={FiShoppingCart}
          iconBg="#ffe8db"
          iconColor="#ea580c"
          value={stats.abandonedCarts.value.toLocaleString("en-US")}
          label="السلات المتروكة"
          trend={{
            value: stats.abandonedCarts.change,
            isPercent: stats.abandonedCarts.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/abandoned-carts")}
        />
        <DashboardStatCard
          icon={FiAward}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={stats.subscribedMembers.value.toLocaleString("en-US")}
          label="الأعضاء المشتركون"
          trend={{
            value: stats.subscribedMembers.change,
            isPercent: stats.subscribedMembers.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/memberships")}
        />
        <DashboardStatCard
          icon={FiUserPlus}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.newCustomers.value.toLocaleString("en-US")}
          label="عملاء جدد"
          trend={{
            value: stats.newCustomers.change,
            isPercent: stats.newCustomers.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/customers")}
        />
        <DashboardStatCard
          icon={FiShare2}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={`${stats.affiliateProfit.value.toLocaleString("en-US")} ل.س`}
          label="أرباح التسويق بالعمولة"
          trend={{
            value: stats.affiliateProfit.change,
            isPercent: stats.affiliateProfit.changeIsPercent,
          }}
          onDetailsClick={() => navigate("/affiliate-marketing")}
        />
      </div>

      {/* أداء المبيعات */}
      <SalesPerformanceChart
        period={salesPeriod}
        onPeriodChange={setSalesPeriod}
        customFrom={customFrom}
        customTo={customTo}
        onCustomDatesChange={handleCustomDatesChange}
        data={salesData}
        loading={loadingSales}
      />

      {/* أحدث الطلبات + المنتجات الأكثر مشاهدة */}
      <div className="dashboard-home-row">
        <div className="reports-card">
          <div className="dashboard-home-card-header">
            <h3 className="reports-card-title">أحدث الطلبات</h3>
            <button
              type="button"
              className="dashboard-home-view-all"
              onClick={() => navigate("/orders")}
            >
              عرض الكل
              <FiChevronLeft />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="reports-empty-note">لا توجد طلبات بعد</p>
          ) : (
            <div className="dashboard-home-table-wrapper">
              <table className="categories-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>قيمة الطلب</th>
                    <th>الحالة</th>
                    <th>الوقت</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const badge = getOrderStatusBadge(order.status);
                    return (
                      <tr key={order.id}>
                        <td>
                          <span
                            className="orders-table-number"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            {order.orderNumber}
                          </span>
                        </td>
                        <td>
                          <div className="orders-table-customer">
                            <span className="orders-table-avatar">
                              {order.customer?.fullName?.charAt(0) || "؟"}
                            </span>
                            <span>
                              {order.customer?.fullName || "زبون محذوف"}
                            </span>
                          </div>
                        </td>
                        <td>{order.grandTotal.toLocaleString("en-US")} ل.س</td>
                        <td>
                          <span
                            className={`order-status-badge order-status-badge--${badge.type}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td>{formatRelativeTime(order.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="dashboard-home-action-link"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            عرض الطلب
                            <FiChevronLeft />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="reports-card">
          <div className="dashboard-home-card-header">
            <h3 className="reports-card-title">المنتجات الأكثر مشاهدة</h3>
            <button
              type="button"
              className="dashboard-home-view-all"
              onClick={() => navigate("/products")}
            >
              عرض الكل
              <FiChevronLeft />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <p className="reports-empty-note">لا توجد بيانات مشاهدات بعد</p>
          ) : (
            <div className="dashboard-home-table-wrapper">
              <table className="categories-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>المشاهدات</th>
                    <th>المفضلة</th>
                    <th>أضيف للسلة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => {
                    const badge = getProductStatusBadge(product);
                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="categories-table-name">
                            <div className="categories-table-name-image">
                              {product.image ? (
                                <img
                                  src={getImageUrl(product.image)}
                                  alt={product.name}
                                />
                              ) : (
                                <FiImage />
                              )}
                            </div>
                            <div className="admin-favorites-product-info">
                              <span>{product.name}</span>
                              <span className="admin-favorites-product-sku">
                                {product.sku || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="dashboard-home-metric">
                            {product.viewsCount.toLocaleString("en-US")}
                            <FiEye />
                          </span>
                        </td>
                        <td>
                          <span className="admin-favorites-count">
                            <FiHeart /> {product.favoritesCount}
                          </span>
                        </td>
                        <td>
                          <span className="dashboard-home-metric">
                            {product.cartAddsCount.toLocaleString("en-US")}
                            <FiShoppingCart />
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-favorites-status-badge admin-favorites-status-badge--${badge.type}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiEye,
  FiClipboard,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiRotateCcw,
  FiSettings,
  FiDownload,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import {
  getOrderStatusBadge,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_TRANSITIONS,
} from "../utils/orderStatus";
import StatusTabs from "../components/StatusTabs";
import Pagination from "../components/Pagination";
import ActionsDropdown from "../components/ActionsDropdown";

/*
  Orders
  - صفحة "الطلبات": إدارة شاملة لكل طلبات المتجر من مكان واحد
    - كروت إحصائية قابلة للنقر كفلتر سريع (نفس فلسفة Inventory.jsx)
      مع "التغيّر هذا الأسبوع" الحقيقي المحسوب من سجل الحالة الفعلي
    - تبويبات فلترة بكل الحالات + عدّاد كل حالة
    - بحث برقم الطلب/اسم أو هاتف الزبون/المدينة + ترتيب + تقسيم صفحات
    - تغيير الحالة مباشرة من الجدول (بس ضمن الانتقالات المنطقية المسموحة)
*/

const STAT_CARDS = [
  {
    key: "pending",
    label: "طلبات جديدة",
    icon: FiPackage,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
  },
  {
    key: "processing",
    label: "قيد التجهيز",
    icon: FiSettings,
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
  },
  {
    key: "shipped",
    label: "تم الشحن",
    icon: FiTruck,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
  },
  {
    key: "delivered",
    label: "تم التسليم",
    icon: FiCheckCircle,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
  },
  {
    key: "returned",
    label: "مرتجعة",
    icon: FiRotateCcw,
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
  },
];

const emptyStats = {
  total: 0,
  totalNewThisWeek: 0,
  totalGrowthPercent: 0,
  byStatus: {},
  deltaThisWeek: {},
};

const sortOptions = [
  { value: "newest", label: "الأحدث أولًا" },
  { value: "oldest", label: "الأقدم أولًا" },
  { value: "amount_desc", label: "المبلغ: الأعلى أولًا" },
  { value: "amount_asc", label: "المبلغ: الأقل أولًا" },
];

const formatDelta = (n) => {
  if (!n) return "بدون تغيير هذا الأسبوع";
  return n > 0 ? `+${n} هذا الأسبوع` : `${n} هذا الأسبوع`;
};

const Orders = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(emptyStats);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/orders/stats`, {
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok) setStats(result.stats || emptyStats);
    } catch (error) {
      // تجاهل، هتفضل الكروت بقيمة 0 من غير ما توقف الصفحة
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sort", sortBy);
      params.append("page", page);
      params.append("limit", 15);

      const res = await fetch(`${API_URL}/admin/orders?${params.toString()}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل الطلبات");
        return;
      }

      setOrders(result.orders || []);
      setPagination(result.pagination || { page: 1, totalPages: 0, total: 0 });
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  // أي تغيير بالفلتر/البحث/الترتيب يرجّع للصفحة الأولى - غير كده ممكن
  // يضل المستخدم عالق بصفحة رقمها أكبر من عدد صفحات النتيجة الجديدة
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const tabs = useMemo(
    () => [
      { value: "all", label: "الكل", count: stats.total },
      ...ORDER_STATUS_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        count: stats.byStatus?.[opt.value] || 0,
      })),
    ],
    [stats],
  );

  const handleStatCardClick = (statusKey) => {
    setStatusFilter((prev) => (prev === statusKey ? "all" : statusKey));
  };

  const handleQuickStatusChange = async (order, newStatus) => {
    if (newStatus === order.status) return;
    setUpdatingId(order.id);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الطلب");
        return;
      }

      toast.success("تم تحديث حالة الطلب");
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)),
      );
      fetchStats();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------- تصدير CSV للصفحة الحالية المعروضة ---------- */
  const handleExport = () => {
    if (orders.length === 0) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    const headers = [
      "رقم الطلب",
      "الزبون",
      "الهاتف",
      "المدينة",
      "القطع",
      "المبلغ",
      "الحالة",
      "التاريخ",
    ];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.customer?.fullName || "—",
      o.customer?.phone || "—",
      o.city,
      o.itemsCount,
      o.grandTotal,
      getOrderStatusBadge(o.status).label,
      formatDate(o.createdAt),
    ]);

    const csvContent = [headers, ...rows]
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
    link.download = `الطلبات-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="orders-page">
      {/* الهيدر */}
      <div className="orders-header">
        <div>
          <h1 className="orders-title">الطلبات</h1>
          <p className="orders-subtitle">
            إدارة ومتابعة جميع طلبات المتجر ({stats.total} طلب،{" "}
            {stats.totalGrowthPercent >= 0 ? "+" : ""}
            {stats.totalGrowthPercent}% هذا الأسبوع)
          </p>
        </div>
        <button
          type="button"
          className="orders-export-btn"
          onClick={handleExport}
        >
          <FiDownload />
          تصدير الصفحة الحالية
        </button>
      </div>

      {/* كروت الإحصائيات - قابلة للنقر كفلتر سريع */}
      <div className="orders-stats-grid">
        {STAT_CARDS.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
          <button
            type="button"
            key={key}
            className={`stat-card orders-stat-card ${
              statusFilter === key ? "orders-stat-card--active" : ""
            }`}
            onClick={() => handleStatCardClick(key)}
          >
            <div
              className="stat-card-icon"
              style={{ backgroundColor: iconBg, color: iconColor }}
            >
              <Icon />
            </div>
            <span className="stat-card-value">
              {stats.byStatus?.[key] || 0}
            </span>
            <span className="stat-card-label">{label}</span>
            <span
              className={`orders-stat-delta ${
                (stats.deltaThisWeek?.[key] || 0) < 0
                  ? "orders-stat-delta--down"
                  : ""
              }`}
            >
              {formatDelta(stats.deltaThisWeek?.[key] || 0)}
            </span>
          </button>
        ))}
        <div className="stat-card orders-stat-card orders-stat-card--total">
          <div
            className="stat-card-icon"
            style={{
              backgroundColor: "#fbe9ec",
              color: "var(--primary-color)",
            }}
          >
            <FiClipboard />
          </div>
          <span className="stat-card-value">{stats.total}</span>
          <span className="stat-card-label">إجمالي الطلبات</span>
          <span className="orders-stat-delta">
            {stats.totalGrowthPercent >= 0 ? "+" : ""}
            {stats.totalGrowthPercent}% هذا الأسبوع
          </span>
        </div>
      </div>

      {/* تبويبات الحالة */}
      <StatusTabs
        tabs={tabs}
        activeValue={statusFilter}
        onChange={setStatusFilter}
      />

      {/* شريط الأدوات */}
      <div className="orders-toolbar">
        <div className="products-search orders-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث برقم الطلب أو اسم/هاتف الزبون أو المدينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="inventory-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="categories-loading">جاري التحميل...</div>
      ) : orders.length === 0 ? (
        <div className="products-empty">
          <FiPackage size={28} />
          <p>لا توجد طلبات مطابقة</p>
        </div>
      ) : (
        <>
          <div className="orders-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>المدينة</th>
                  <th>القطع</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const badge = getOrderStatusBadge(order.status);
                  const allowedNext =
                    ORDER_STATUS_TRANSITIONS[order.status] || [];
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
                          <div className="orders-table-customer-info">
                            <span>
                              {order.customer?.fullName || "زبون محذوف"}
                            </span>
                            <span className="orders-table-customer-phone">
                              {order.customer?.phone || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{order.city}</td>
                      <td>{order.itemsCount}</td>
                      <td>{order.grandTotal.toLocaleString("en-US")} ل.س</td>
                      <td>
                        <select
                          className={`order-status-select order-status-select--${badge.type}`}
                          value={order.status}
                          disabled={
                            updatingId === order.id || allowedNext.length === 0
                          }
                          onChange={(e) =>
                            handleQuickStatusChange(order, e.target.value)
                          }
                        >
                          <option value={order.status}>{badge.label}</option>
                          {allowedNext.map((value) => (
                            <option key={value} value={value}>
                              {getOrderStatusBadge(value).label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <ActionsDropdown
                          actions={[
                            {
                              label: "عرض تفاصيل الطلب",
                              icon: <FiEye />,
                              onClick: () => navigate(`/orders/${order.id}`),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default Orders;

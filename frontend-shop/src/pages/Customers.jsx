import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiUsers,
  FiShoppingBag,
  FiAward,
  FiDollarSign,
  FiEye,
  FiUser,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import StatCard from "../components/StatCard";
import ActionsDropdown from "../components/ActionsDropdown";
import ToggleSwitch from "../components/ToggleSwitch";
import Pagination from "../components/Pagination";
import CustomerDetailModal from "../components/CustomerDetailModal";

/*
  Customers
  - صفحة "العملاء": إدارة حسابات الزبائن - بحث/فلترة/ترتيب، تعليق أو
    إعادة تفعيل الحساب مباشرة من الجدول، وعرض ملف كامل لكل زبون (نافذة
    منبثقة بإحصائياته وآخر طلباته)
  - "عميل VIP" محسوب لحظيًا بالباك إند (حد أدنى إنفاق أو عدد طلبات) -
    مش حقل مخزّن، فبيتحدّث تلقائيًا مع كل طلب جديد
*/

const statusOptions = [
  { value: "all", label: "كل العملاء" },
  { value: "active", label: "نشط" },
  { value: "suspended", label: "معلّق" },
  { value: "vip", label: "عملاء VIP" },
];

const sortOptions = [
  { value: "newest", label: "الأحدث تسجيلًا" },
  { value: "oldest", label: "الأقدم تسجيلًا" },
  { value: "most_orders", label: "الأكثر طلبات" },
  { value: "most_spent", label: "الأكثر إنفاقًا" },
];

const emptyStats = {
  totalCustomers: 0,
  totalOrders: 0,
  vipCustomers: 0,
  totalSpent: 0,
};

const Customers = () => {
  const [stats, setStats] = useState(emptyStats);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/customers/stats`, {
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok) setStats(result.stats || emptyStats);
    } catch (error) {
      // تجاهل، هتفضل الكروت بقيمة 0
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sort", sortBy);
      params.append("page", page);
      params.append("limit", 15);

      const res = await fetch(
        `${API_URL}/admin/customers?${params.toString()}`,
        { credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل العملاء");
        return;
      }

      setCustomers(result.customers || []);
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
      fetchCustomers();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === "active" ? "suspended" : "active";
    setUpdatingId(customer.id);
    try {
      const res = await fetch(
        `${API_URL}/admin/customers/${customer.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الحساب");
        return;
      }

      toast.success(result.message);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customer.id ? { ...c, status: newStatus } : c,
        ),
      );
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="customers-page">
      {/* الهيدر */}
      <div className="customers-header">
        <div>
          <h1 className="customers-title">العملاء</h1>
          <p className="customers-subtitle">
            {stats.totalCustomers} عميل مسجّل في المتجر
          </p>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="customers-stats-grid">
        <StatCard
          icon={FiUsers}
          iconBg="#fbe9ec"
          iconColor="var(--primary-color)"
          value={stats.totalCustomers}
          label="إجمالي العملاء"
        />
        <StatCard
          icon={FiShoppingBag}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          value={stats.totalOrders}
          label="إجمالي الطلبات"
        />
        <StatCard
          icon={FiAward}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={stats.vipCustomers}
          label="عملاء VIP"
        />
        <StatCard
          icon={FiDollarSign}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          value={`${stats.totalSpent.toLocaleString("en-US")} ل.س`}
          label="إجمالي الإنفاق"
        />
      </div>

      {/* شريط الأدوات */}
      <div className="customers-toolbar">
        <div className="products-search customers-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الهاتف أو البريد الإلكتروني..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="inventory-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

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
      ) : customers.length === 0 ? (
        <div className="products-empty">
          <FiUser size={28} />
          <p>لا يوجد عملاء مطابقون</p>
        </div>
      ) : (
        <>
          <div className="customers-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>المدينة</th>
                  <th>الطلبات</th>
                  <th>الإنفاق</th>
                  <th>تاريخ التسجيل</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customers-table-name">
                        <span className="customers-table-avatar">
                          {customer.fullName.charAt(0)}
                        </span>
                        <span>
                          {customer.fullName}
                          {customer.isVip && (
                            <span
                              className="customers-vip-badge"
                              title="عميل VIP"
                            >
                              <FiAward />
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>{customer.email || "—"}</td>
                    <td dir="ltr">{customer.phone}</td>
                    <td>{customer.city}</td>
                    <td>{customer.ordersCount} طلب</td>
                    <td>{customer.totalSpent.toLocaleString("en-US")} ل.س</td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>
                      <div className="customers-status-toggle">
                        <ToggleSwitch
                          checked={customer.status === "active"}
                          onChange={() => handleToggleStatus(customer)}
                        />
                        <span
                          className={
                            customer.status === "active"
                              ? "customers-status-label--active"
                              : "customers-status-label--suspended"
                          }
                        >
                          {updatingId === customer.id
                            ? "..."
                            : customer.status === "active"
                            ? "نشط"
                            : "معلّق"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <ActionsDropdown
                        actions={[
                          {
                            label: "عرض الملف",
                            icon: <FiEye />,
                            onClick: () => setSelectedCustomerId(customer.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
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

      <CustomerDetailModal
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  );
};

export default Customers;

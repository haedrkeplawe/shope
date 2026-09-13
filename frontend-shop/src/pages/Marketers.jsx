import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiShare2,
  FiUserCheck,
  FiShoppingBag,
  FiDollarSign,
  FiEye,
  FiEdit2,
  FiUserX,
  FiPlus,
  FiUsers,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import StatCard from "../components/StatCard";
import ActionsDropdown from "../components/ActionsDropdown";
import ToggleSwitch from "../components/ToggleSwitch";
import Pagination from "../components/Pagination";
import AssignMarketerModal from "../components/AssignMarketerModal";

/*
  Marketers (التسويق بالعمولة)
  ------------------------------------------------------------------
  صفحة إدارة المسوّقين - المسوّق هو نفسه حساب زبون عادي بالضبط، معلَّم
  من هون بحقل marketer.isMarketer (شوف شرح موديل customer.js الكامل).
  التعيين بيصير عن طريق اختيار زبون مسجَّل فعليًا (بحث بالاسم/الهاتف)،
  مش إنشاء حساب جديد - نفس مبدأ باقي النظام (adminMarketer.controller.js)

  ⚠️ "إجمالي المبيعات" و"إجمالي العمولة" (بالكروت وبعمود الجدول) محسوبين
  فقط من الطلبات بحالة "تم التسليم" - نفس قاعدة عميل VIP بالضبط. طلب
  لسه قيد التنفيذ ما بيدخل هالرقم لحد ما يتأكد فعليًا إنه وصل
*/

const statusOptions = [
  { value: "all", label: "كل المسوّقين" },
  { value: "active", label: "نشط" },
  { value: "paused", label: "معلَّق" },
];

const sortOptions = [
  { value: "newest", label: "الأحدث تعيينًا" },
  { value: "oldest", label: "الأقدم تعيينًا" },
  { value: "most_sales", label: "الأكثر مبيعًا" },
  { value: "most_commission", label: "الأعلى عمولة" },
];

const emptyStats = {
  totalMarketers: 0,
  activeMarketers: 0,
  totalSales: 0,
  totalCommission: 0,
};

const Marketers = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(emptyStats);
  const [marketers, setMarketers] = useState([]);
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
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/marketers/stats`, {
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok) setStats(result.stats || emptyStats);
    } catch (error) {
      // تجاهل، هتفضل الكروت بقيمة 0
    }
  }, []);

  const fetchMarketers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sort", sortBy);
      params.append("page", page);
      params.append("limit", 15);

      const res = await fetch(
        `${API_URL}/admin/marketers?${params.toString()}`,
        { credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل المسوّقين");
        return;
      }

      setMarketers(result.marketers || []);
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
      fetchMarketers();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchMarketers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const refreshAll = () => {
    fetchStats();
    fetchMarketers();
  };

  const handleToggleStatus = async (marketer) => {
    const newStatus = marketer.status === "active" ? "paused" : "active";
    setUpdatingId(marketer.id);
    try {
      const res = await fetch(`${API_URL}/admin/marketers/${marketer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة المسوّق");
        return;
      }

      toast.success(result.message || "تم تحديث الحالة");
      setMarketers((prev) =>
        prev.map((m) =>
          m.id === marketer.id ? { ...m, status: newStatus } : m,
        ),
      );
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUnassign = async (marketer) => {
    if (
      !window.confirm(
        `هل أنت متأكد من إلغاء تعيين "${marketer.fullName}" كمسوّق؟ حسابه العادي بيضل موجود، وبس بيرجع زبون عادي.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/marketers/${marketer.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إلغاء تعيين المسوّق");
        return;
      }

      toast.success(result.message || "تم إلغاء تعيين المسوّق");
      refreshAll();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  return (
    <div className="customers-page">
      {/* الهيدر */}
      <div className="customers-header">
        <div>
          <h1 className="customers-title">التسويق بالعمولة</h1>
          <p className="customers-subtitle">
            إدارة المسوّقين وتتبع مبيعاتهم وعمولاتهم
          </p>
        </div>
        <button
          type="button"
          className="category-form-submit affiliate-add-btn"
          onClick={() => setShowAssignModal(true)}
        >
          <FiPlus /> إضافة مسوّق جديد
        </button>
      </div>

      {/* الإحصائيات */}
      <div className="customers-stats-grid">
        <StatCard
          icon={FiShare2}
          iconBg="#fbe9ec"
          iconColor="var(--primary-color)"
          value={stats.totalMarketers}
          label="إجمالي المسوّقين"
        />
        <StatCard
          icon={FiUserCheck}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          value={stats.activeMarketers}
          label="مسوّقون نشطون"
        />
        <StatCard
          icon={FiShoppingBag}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          value={stats.totalSales}
          label="إجمالي المبيعات"
        />
        <StatCard
          icon={FiDollarSign}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={`${stats.totalCommission.toLocaleString("en-US")} ل.س`}
          label="إجمالي العمولات"
        />
      </div>

      {/* شريط الأدوات */}
      <div className="customers-toolbar">
        <div className="products-search customers-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الهاتف أو رمز الإحالة..."
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
      ) : marketers.length === 0 ? (
        <div className="products-empty">
          <FiUsers size={28} />
          <p>لا يوجد مسوّقون بعد</p>
        </div>
      ) : (
        <>
          <div className="customers-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>المسوّق</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>رمز الإحالة</th>
                  <th>نسبة العمولة</th>
                  <th>المبيعات</th>
                  <th>العمولة</th>
                  <th>تاريخ الانضمام</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {marketers.map((marketer) => (
                  <tr key={marketer.id}>
                    <td>
                      <div className="customers-table-name">
                        <span className="customers-table-avatar">
                          {marketer.fullName.charAt(0)}
                        </span>
                        <span>{marketer.fullName}</span>
                      </div>
                    </td>
                    <td>{marketer.email || "—"}</td>
                    <td dir="ltr">{marketer.phone}</td>
                    <td>
                      <span className="affiliate-code-chip" dir="ltr">
                        {marketer.code}
                      </span>
                    </td>
                    <td>{marketer.commissionPercentage}%</td>
                    <td>{marketer.salesCount} طلب</td>
                    <td className="affiliate-commission-cell">
                      {marketer.totalCommission.toLocaleString("en-US")} ل.س
                    </td>
                    <td>{formatDate(marketer.assignedAt)}</td>
                    <td>
                      <div className="customers-status-toggle">
                        <ToggleSwitch
                          checked={marketer.status === "active"}
                          onChange={() => handleToggleStatus(marketer)}
                        />
                        <span
                          className={
                            marketer.status === "active"
                              ? "customers-status-label--active"
                              : "customers-status-label--suspended"
                          }
                        >
                          {updatingId === marketer.id
                            ? "..."
                            : marketer.status === "active"
                            ? "نشط"
                            : "معلَّق"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <ActionsDropdown
                        actions={[
                          {
                            label: "عرض التفاصيل",
                            icon: <FiEye />,
                            onClick: () =>
                              navigate(`/affiliate-marketing/${marketer.id}`),
                          },
                          {
                            label: "تعديل",
                            icon: <FiEdit2 />,
                            onClick: () =>
                              navigate(`/affiliate-marketing/${marketer.id}`),
                          },
                          {
                            label: "إلغاء التعيين",
                            icon: <FiUserX />,
                            danger: true,
                            onClick: () => handleUnassign(marketer),
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

      {showAssignModal && (
        <AssignMarketerModal
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setShowAssignModal(false);
            refreshAll();
          }}
        />
      )}
    </div>
  );
};

export default Marketers;

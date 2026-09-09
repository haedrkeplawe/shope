import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiShoppingCart,
  FiAlertTriangle,
  FiCheckCircle,
  FiTrendingUp,
  FiSend,
  FiGift,
  FiUser,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import StatCard from "../components/StatCard";
import Pagination from "../components/Pagination";

/*
  AbandonedCarts (صفحة "السلات المتروكة")
  ------------------------------------------------------------------
  بتعرض سلات الزبائن اللي ما صار فيها أي نشاط (إضافة قطعة) منذ فترة
  كافية (3 ساعات - شوف ABANDONED_THRESHOLD_HOURS بالباك إند) - الهدف
  تشجيع الزبون يكمل شراءه، إما بتذكير بسيط أو بكوبون خصم مخصص له

  - "تذكير": بيبعت إشعار فوري للزبون (بدون مغادرة الصفحة)
  - "كوبون": بيودّي لصفحة إنشاء كوبون جديد مع الزبون جاهز مسبقًا
    (scopeType: زبائن محددين) - وبعد الحفظ، الكوبون بيترسل تلقائيًا
    كإشعار للزبون، ويترصد كمحاولة استرداد لهاي السلة تحديدًا
*/

const sortOptions = [
  { value: "newest", label: "الأحدث تركًا" },
  { value: "oldest", label: "الأقدم تركًا" },
  { value: "value", label: "قيمة السلة" },
];

const emptyStats = {
  lockedValue: 0,
  recoveredValue: 0,
  recoveredCount: 0,
  abandonedCartsCount: 0,
};

// وقت نسبي مبسّط ("منذ كذا") - كافي لهاي الصفحة بدون الحاجة لمكتبة خارجية
const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 60) return `منذ ${diffMinutes || 1} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
};

const AbandonedCarts = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(emptyStats);
  const [carts, setCarts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [remindingId, setRemindingId] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("sort", sortBy);
      params.append("page", page);
      params.append("limit", 15);

      const res = await fetch(
        `${API_URL}/admin/abandoned-carts?${params.toString()}`,
        { credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل السلات المتروكة");
        return;
      }

      setStats(result.stats || emptyStats);
      setCarts(result.carts || []);
      setPagination(result.pagination || { page: 1, totalPages: 0, total: 0 });
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [sortBy, page]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    setPage(1);
  }, [sortBy]);

  const handleRemind = async (cart) => {
    setRemindingId(cart.customerId);
    try {
      const res = await fetch(
        `${API_URL}/admin/abandoned-carts/${cart.customerId}/remind`,
        { method: "POST", credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إرسال التذكير");
        return;
      }

      toast.success(result.message);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setRemindingId(null);
    }
  };

  const handleSendCoupon = (cart) => {
    navigate("/coupons/new", {
      state: {
        presetCustomer: {
          id: cart.customerId,
          fullName: cart.fullName,
          phone: cart.phone,
        },
        cartRecovery: {
          cartValueAtSend: cart.cartValue,
          cartItemsCountAtSend: cart.itemsCount,
        },
      },
    });
  };

  return (
    <div className="abandoned-carts-page">
      <div className="abandoned-carts-header">
        <div>
          <h1 className="abandoned-carts-title">السلات المتروكة</h1>
          <p className="abandoned-carts-subtitle">
            استرداد المبيعات المفقودة وتشجيع العملاء على إكمال الشراء
          </p>
        </div>
      </div>

      <div className="abandoned-carts-stats-grid">
        <StatCard
          icon={FiAlertTriangle}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={`${stats.lockedValue.toLocaleString("en-US")} ل.س`}
          label="قيمة معلّقة"
        />
        <StatCard
          icon={FiTrendingUp}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          value={`${stats.recoveredValue.toLocaleString("en-US")} ل.س`}
          label="قيمة مستردة"
        />
        <StatCard
          icon={FiCheckCircle}
          iconBg="#e0f7f4"
          iconColor="#14b8a6"
          value={stats.recoveredCount}
          label="تم الاسترداد"
        />
        <StatCard
          icon={FiShoppingCart}
          iconBg="#fbe9ec"
          iconColor="var(--primary-color)"
          value={stats.abandonedCartsCount}
          label="سلات متروكة"
        />
      </div>

      <div className="abandoned-carts-toolbar">
        <select
          className="inventory-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              ترتيب حسب: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="categories-loading">جاري التحميل...</div>
      ) : carts.length === 0 ? (
        <div className="products-empty">
          <FiShoppingCart size={28} />
          <p>لا توجد سلات متروكة حاليًا</p>
        </div>
      ) : (
        <>
          <div className="abandoned-carts-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>المنتجات</th>
                  <th>قيمة السلة</th>
                  <th>آخر نشاط</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => (
                  <tr key={cart.customerId}>
                    <td>
                      <div className="customers-table-name">
                        <span className="customers-table-avatar">
                          <FiUser />
                        </span>
                        <div className="abandoned-carts-customer-info">
                          <span>{cart.fullName}</span>
                          <span className="abandoned-carts-phone" dir="ltr">
                            {cart.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{cart.itemsCount} قطعة</td>
                    <td>{cart.cartValue.toLocaleString("en-US")} ل.س</td>
                    <td>{formatRelativeTime(cart.lastActivity)}</td>
                    <td>
                      <div className="abandoned-carts-actions">
                        <button
                          type="button"
                          className="abandoned-carts-action-btn"
                          disabled={remindingId === cart.customerId}
                          onClick={() => handleRemind(cart)}
                        >
                          <FiSend />
                          {remindingId === cart.customerId ? "..." : "تذكير"}
                        </button>
                        <button
                          type="button"
                          className="abandoned-carts-action-btn abandoned-carts-action-btn--gold"
                          onClick={() => handleSendCoupon(cart)}
                        >
                          <FiGift />
                          كوبون
                        </button>
                      </div>
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
    </div>
  );
};

export default AbandonedCarts;

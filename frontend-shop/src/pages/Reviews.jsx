import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiStar,
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiCheck,
  FiX,
  FiTrash2,
  FiImage,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatDate } from "../utils/formatDate";
import { getRatingStatusBadge } from "../utils/ratingStatus";
import StatCard from "../components/StatCard";
import StatusTabs from "../components/StatusTabs";
import Pagination from "../components/Pagination";

/*
  Reviews
  - صفحة "التقييمات والتعليقات": مراجعة تقييمات الزبائن والموافقة عليها
    قبل ظهورها بصفحة المنتج العامة (شوف models/rating.js → approvalStatus)
  - الموافقة/الرفض بيأثر فورًا على متوسط/عدد تقييمات المنتج بالمتجر
    (شوف adminRating.controller.js → recalculateProductRatingCache)
*/

const emptyStats = {
  averageRating: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0,
};

// تمثيل بصري بسيط للنجوم (يدعم نصف نجمة) - بدون مكتبة خارجية
const StarRating = ({ value }) => {
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    const filled = value >= i;
    const half = !filled && value >= i - 0.5;
    stars.push(
      <FiStar
        key={i}
        className={`review-star ${filled ? "review-star--filled" : ""} ${
          half ? "review-star--half" : ""
        }`}
      />,
    );
  }
  return <div className="review-stars">{stars}</div>;
};

const Reviews = () => {
  const [stats, setStats] = useState(emptyStats);
  const [ratings, setRatings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/ratings/stats`, {
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok) setStats(result.stats || emptyStats);
    } catch (error) {
      // تجاهل
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page);
      params.append("limit", 10);

      const res = await fetch(`${API_URL}/admin/ratings?${params.toString()}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل التقييمات");
        return;
      }

      setRatings(result.ratings || []);
      setPagination(result.pagination || { page: 1, totalPages: 0, total: 0 });
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRatings();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchRatings]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const tabs = useMemo(
    () => [
      { value: "all", label: "الكل", count: stats.total },
      { value: "pending", label: "قيد المراجعة", count: stats.pending },
      { value: "approved", label: "معتمدة", count: stats.approved },
      { value: "rejected", label: "مرفوضة", count: stats.rejected },
    ],
    [stats],
  );

  const refreshAfterAction = () => {
    fetchStats();
    fetchRatings();
  };

  const handleUpdateApproval = async (rating, approvalStatus) => {
    setBusyId(rating.id);
    try {
      const res = await fetch(
        `${API_URL}/admin/ratings/${rating.id}/approval`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ approvalStatus }),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة التقييم");
        return;
      }

      toast.success(result.message);
      refreshAfterAction();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rating) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا التقييم نهائيًا؟",
    );
    if (!confirmed) return;

    setBusyId(rating.id);
    try {
      const res = await fetch(`${API_URL}/admin/ratings/${rating.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف التقييم");
        return;
      }

      toast.success(result.message || "تم حذف التقييم");
      refreshAfterAction();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="reviews-page">
      {/* الهيدر */}
      <div className="reviews-header">
        <div>
          <h1 className="reviews-title">التقييمات والتعليقات</h1>
          <p className="reviews-subtitle">مراجعة وإدارة تقييمات العملاء</p>
        </div>
        {stats.pending > 0 && (
          <span className="reviews-pending-pill">
            <FiClock />
            {stats.pending} تقييم بانتظار الموافقة
          </span>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="reviews-stats-grid">
        <StatCard
          icon={FiStar}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={stats.averageRating}
          label="متوسط التقييم"
        />
        <StatCard
          icon={FiClock}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          value={stats.pending}
          label="قيد المراجعة"
        />
        <StatCard
          icon={FiCheckCircle}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          value={stats.approved}
          label="معتمدة"
        />
        <StatCard
          icon={FiMessageSquare}
          iconBg="#fbe9ec"
          iconColor="var(--primary-color)"
          value={stats.total}
          label="إجمالي التقييمات"
        />
      </div>

      {/* تبويبات الحالة */}
      <StatusTabs
        tabs={tabs}
        activeValue={statusFilter}
        onChange={setStatusFilter}
      />

      {/* البحث */}
      <div className="reviews-toolbar">
        <div className="products-search reviews-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث باسم العميل أو اسم المنتج أو نص التعليق..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* قائمة التقييمات */}
      {loading ? (
        <div className="categories-loading">جاري التحميل...</div>
      ) : ratings.length === 0 ? (
        <div className="products-empty">
          <FiMessageSquare size={28} />
          <p>لا توجد تقييمات مطابقة</p>
        </div>
      ) : (
        <>
          <div className="reviews-list">
            {ratings.map((rating) => {
              const badge = getRatingStatusBadge(rating.approvalStatus);
              const isBusy = busyId === rating.id;
              return (
                <div className="review-card" key={rating.id}>
                  <div className="review-card-header">
                    <div className="review-card-customer">
                      <span className="customers-table-avatar">
                        {rating.customer?.fullName?.charAt(0) || "؟"}
                      </span>
                      <div className="review-card-customer-info">
                        <span className="review-card-customer-name">
                          {rating.customer?.fullName || "زبون محذوف"}
                        </span>
                        <StarRating value={rating.value} />
                      </div>
                    </div>
                    <span className="review-card-date">
                      {formatDate(rating.createdAt)}
                    </span>
                  </div>

                  {rating.product && (
                    <div className="review-card-product">
                      <div className="review-card-product-image">
                        {rating.product.image ? (
                          <img
                            src={getImageUrl(rating.product.image)}
                            alt={rating.product.name}
                          />
                        ) : (
                          <FiImage />
                        )}
                      </div>
                      <span>على المنتج: {rating.product.name}</span>
                    </div>
                  )}

                  {rating.comment && (
                    <p className="review-card-comment">{rating.comment}</p>
                  )}

                  <div className="review-card-footer">
                    <span
                      className={`review-status-badge review-status-badge--${badge.type}`}
                    >
                      <span className="review-status-dot" />
                      {badge.label}
                    </span>

                    <div className="review-card-actions">
                      {rating.approvalStatus !== "approved" && (
                        <button
                          type="button"
                          className="review-action-btn review-action-btn--approve"
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateApproval(rating, "approved")
                          }
                        >
                          <FiCheck />
                          اعتماد
                        </button>
                      )}
                      {rating.approvalStatus !== "rejected" && (
                        <button
                          type="button"
                          className="review-action-btn review-action-btn--reject"
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateApproval(rating, "rejected")
                          }
                        >
                          <FiX />
                          رفض
                        </button>
                      )}
                      <button
                        type="button"
                        className="review-action-btn review-action-btn--delete"
                        disabled={isBusy}
                        onClick={() => handleDelete(rating)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

export default Reviews;

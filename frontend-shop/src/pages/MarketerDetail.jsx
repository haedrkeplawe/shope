import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiCheckCircle,
  FiPercent,
  FiDollarSign,
  FiShoppingBag,
  FiCopy,
  FiUserX,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import ToggleSwitch from "../components/ToggleSwitch";

/*
  MarketerDetail
  ------------------------------------------------------------------
  صفحة تفاصيل مسوّق واحد - بياناته + إحصائياته (طلبات "تم التسليم" بس -
  شوف شرح adminMarketer.controller.js) + رسم مبيعات آخر 6 شهور + آخر 10
  طلبات جاءت عن طريق رمزه (بكل الحالات - للشفافية) + تعديل نسبة العمولة/
  الرمز/الحالة + إلغاء التعيين بالكامل
*/
const MarketerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [marketer, setMarketer] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [codeDraft, setCodeDraft] = useState("");
  const [commissionDraft, setCommissionDraft] = useState(10);
  const [statusDraft, setStatusDraft] = useState("active");
  const [saving, setSaving] = useState(false);

  const fetchMarketer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/marketers/${id}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات المسوّق");
        navigate("/affiliate-marketing");
        return;
      }

      setMarketer(result.marketer);
      setMonthlySales(result.monthlySales || []);
      setRecentOrders(result.recentOrders || []);
      setCodeDraft(result.marketer.code);
      setCommissionDraft(result.marketer.commissionPercentage);
      setStatusDraft(result.marketer.status);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchMarketer();
  }, [fetchMarketer]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(marketer.code);
    toast.success("تم نسخ رمز الإحالة");
  };

  const handleSaveSettings = async () => {
    if (!codeDraft.trim()) {
      toast.error("رمز الإحالة مطلوب");
      return;
    }
    const commission = Number(commissionDraft);
    if (!commission || commission <= 0 || commission > 100) {
      toast.error("نسبة العمولة يجب أن تكون بين 1 و100");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/marketers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: codeDraft.trim(),
          commissionPercentage: commission,
          status: statusDraft,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ التعديلات");
        return;
      }

      toast.success(result.message || "تم حفظ التعديلات");
      fetchMarketer();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (
      !window.confirm(
        `هل أنت متأكد من إلغاء تعيين "${marketer.fullName}" كمسوّق؟ حسابه العادي بيضل موجود، وبس بيرجع زبون عادي.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/marketers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إلغاء تعيين المسوّق");
        return;
      }

      toast.success(result.message || "تم إلغاء تعيين المسوّق");
      navigate("/affiliate-marketing");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!marketer) return null;

  const maxMonthlyValue = Math.max(1, ...monthlySales.map((m) => m.value));

  return (
    <div className="order-detail-page">
      {/* الهيدر */}
      <div className="order-detail-header">
        <button
          type="button"
          className="order-detail-back"
          onClick={() => navigate("/affiliate-marketing")}
        >
          <FiArrowRight />
          العودة للمسوّقين
        </button>
        <div className="order-detail-header-main">
          <div>
            <h1 className="order-detail-title">
              {marketer.fullName}
              <span
                className={`order-status-badge order-status-badge--${
                  marketer.status === "active" ? "delivered" : "cancelled"
                }`}
              >
                {marketer.status === "active" ? "نشط" : "معلَّق"}
              </span>
            </h1>
            <p className="order-detail-subtitle">
              مسوّق بالعمولة · انضم {formatDate(marketer.assignedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* كروت الإحصائيات */}
      <div className="affiliate-detail-stats-grid">
        <div className="affiliate-detail-stat-card">
          <span className="affiliate-detail-stat-icon">
            <FiCheckCircle />
          </span>
          <span className="affiliate-detail-stat-label">الحالة</span>
          <span className="affiliate-detail-stat-value">
            {marketer.status === "active" ? "نشط" : "معلَّق"}
          </span>
        </div>
        <div className="affiliate-detail-stat-card">
          <span className="affiliate-detail-stat-icon">
            <FiPercent />
          </span>
          <span className="affiliate-detail-stat-label">نسبة العمولة</span>
          <span className="affiliate-detail-stat-value">
            {marketer.commissionPercentage}%
          </span>
        </div>
        <div className="affiliate-detail-stat-card">
          <span className="affiliate-detail-stat-icon">
            <FiDollarSign />
          </span>
          <span className="affiliate-detail-stat-label">إجمالي العمولة</span>
          <span className="affiliate-detail-stat-value">
            {marketer.totalCommission.toLocaleString("en-US")} ل.س
          </span>
        </div>
        <div className="affiliate-detail-stat-card">
          <span className="affiliate-detail-stat-icon">
            <FiShoppingBag />
          </span>
          <span className="affiliate-detail-stat-label">إجمالي المبيعات</span>
          <span className="affiliate-detail-stat-value">
            {marketer.totalSales}
          </span>
        </div>
      </div>

      <div className="order-detail-grid">
        {/* العمود الرئيسي */}
        <div className="order-detail-main">
          {/* الرسم الشهري */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">
              المبيعات الشهرية (آخر 6 شهور)
            </h3>
            <div className="affiliate-bar-chart">
              {monthlySales.map((m) => (
                <div className="affiliate-bar-col" key={m.label}>
                  <span className="affiliate-bar-value">
                    {m.value > 0 ? m.value : ""}
                  </span>
                  <div className="affiliate-bar-track">
                    <div
                      className="affiliate-bar-fill"
                      style={{
                        height: `${Math.max(
                          4,
                          (m.value / maxMonthlyValue) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="affiliate-bar-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* آخر المبيعات */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">آخر المبيعات</h3>
            {recentOrders.length === 0 ? (
              <p className="reports-empty-note">
                لسه ما في أي طلب استخدم رمز هذا المسوّق
              </p>
            ) : (
              <div className="affiliate-recent-sales-list">
                {recentOrders.map((order) => (
                  <div className="affiliate-recent-sale-row" key={order.id}>
                    <div>
                      <span className="affiliate-recent-sale-amount">
                        {order.grandTotal.toLocaleString("en-US")} ل.س
                      </span>
                      <span
                        className={`affiliate-recent-sale-commission${
                          order.status === "delivered"
                            ? ""
                            : " affiliate-recent-sale-commission--pending"
                        }`}
                      >
                        +{order.commissionAmount.toLocaleString("en-US")} ل.س
                        عمولة{" "}
                        {order.status !== "delivered" && "(بانتظار التسليم)"}
                      </span>
                    </div>
                    <div className="affiliate-recent-sale-meta">
                      <span>#{order.orderNumber}</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* العمود الجانبي */}
        <div className="order-detail-side">
          {/* رمز الإحالة */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">رمز الإحالة</h3>
            <div className="affiliate-code-box">
              <span dir="ltr">{marketer.code}</span>
              <button type="button" onClick={handleCopyCode}>
                <FiCopy />
              </button>
            </div>
          </div>

          {/* تعديل بيانات المسوّق */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">تعديل بيانات المسوّق</h3>

            <label className="order-form-label">رمز الإحالة</label>
            <input
              type="text"
              className="order-form-input"
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              dir="ltr"
            />

            <label className="order-form-label">نسبة العمولة (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              className="order-form-input"
              value={commissionDraft}
              onChange={(e) => setCommissionDraft(e.target.value)}
            />

            <label className="advanced-filter-modal-toggle-row affiliate-status-toggle-row">
              <span>مسوّق نشط</span>
              <ToggleSwitch
                checked={statusDraft === "active"}
                onChange={(checked) =>
                  setStatusDraft(checked ? "active" : "paused")
                }
              />
            </label>

            <button
              type="button"
              className="order-form-submit"
              disabled={saving}
              onClick={handleSaveSettings}
            >
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>

          {/* إلغاء التعيين */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">إلغاء التعيين</h3>
            <p className="order-form-hint">
              حساب الزبون العادي بيضل موجود بكل بياناته وطلباته - بس بيفقد
              صلاحية "مسوّق" ويختفي عنده قسم "لوحة المسوّق" بالمتجر
            </p>
            <button
              type="button"
              className="order-form-submit order-form-submit--muted affiliate-unassign-btn"
              onClick={handleUnassign}
            >
              <FiUserX /> إلغاء تعيين المسوّق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketerDetail;

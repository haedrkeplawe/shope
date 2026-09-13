import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiTrendingUp,
  FiDollarSign,
  FiAward,
  FiUser,
  FiPlus,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import StatCard from "../components//StatCard";
import MembershipTierEditModal from "../components/mimberships/MembershipTierEditModal";
import MembershipMembersModal from "../components/mimberships/MembershipMembersModal";
import AssignMembershipModal from "../components/mimberships/AssignMembershipModal";

/*
  Memberships (العضويات والاشتراكات)
  ------------------------------------------------------------------
  ⚠️ 3 باقات ثابتة بس (ذهبية/فضية/مجانية) - لا يوجد أي زر "إضافة باقة
  جديدة" هون عن قصد (شوف شرح كامل بـ models/membershipTier.js). زر
  "إضافة عضو" بالهيدر بيفتح مباشرة اختيار زبون + باقة (بدون تحديد باقة
  مسبقة) - نفس تصرف "عرض الأعضاء" داخل كل بطاقة بس بلا باقة محددة سلفًا

  كل التفعيل/الإلغاء يدوي بالكامل من هون - بلا أي بوابة دفع أو تجديد
  تلقائي (شوف شرح كامل بـ adminMembership.controller.js)
*/
const Memberships = () => {
  const [tiers, setTiers] = useState([]);
  const [stats, setStats] = useState({
    totalActiveMembers: 0,
    estimatedMonthlyRevenue: 0,
    growthPercent: 0,
  });
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTier, setEditingTier] = useState(null);
  const [viewingTierKey, setViewingTierKey] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, subscribersRes] = await Promise.all([
        fetch(`${API_URL}/admin/memberships`, { credentials: "include" }),
        fetch(`${API_URL}/admin/memberships/recent-subscribers?limit=5`, {
          credentials: "include",
        }),
      ]);

      const overviewResult = await overviewRes.json();
      const subscribersResult = await subscribersRes.json();

      if (!overviewRes.ok) {
        toast.error(overviewResult.message || "تعذر تحميل بيانات العضويات");
        return;
      }

      setTiers(overviewResult.tiers);
      setStats(overviewResult.stats);
      setSubscribers(subscribersResult.subscribers || []);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const viewingTier = tiers.find((t) => t.tierKey === viewingTierKey);

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  return (
    <div className="memberships-page">
      <div className="memberships-header">
        <div>
          <h1 className="memberships-title">العضويات والاشتراكات</h1>
          <p className="memberships-subtitle">إدارة باقات العضوية والمشتركين</p>
        </div>
        <button
          type="button"
          className="memberships-add-btn"
          onClick={() => setShowAssignModal(true)}
        >
          <FiPlus /> إضافة عضو
        </button>
      </div>

      <div className="memberships-stats-grid">
        <StatCard
          icon={FiTrendingUp}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          value={`${stats.growthPercent >= 0 ? "+" : ""}${
            stats.growthPercent
          }%`}
          label="النمو الشهري - مقارنة بالشهر الماضي"
        />
        <StatCard
          icon={FiDollarSign}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
          value={`${stats.estimatedMonthlyRevenue.toLocaleString("en-US")} ل.س`}
          label="الإيرادات الشهرية التقديرية من الاشتراكات"
        />
        <StatCard
          icon={FiAward}
          iconBg="#fce7e9"
          iconColor="var(--primary-color)"
          value={stats.totalActiveMembers}
          label="إجمالي الأعضاء النشطين"
        />
      </div>

      <div className="memberships-tiers-grid">
        {tiers.map((tier) => (
          <div className="membership-tier-card" key={tier.tierKey}>
            <div className="membership-tier-card-header">
              <h3>{tier.displayName}</h3>
              {tier.tierKey === "free" ? (
                <span className="membership-tier-badge membership-tier-badge--default">
                  الحالة الطبيعية
                </span>
              ) : (
                <span
                  className={`membership-tier-badge ${
                    tier.isActive
                      ? "membership-tier-badge--active"
                      : "membership-tier-badge--paused"
                  }`}
                >
                  {tier.isActive ? "مفعّلة" : "موقوفة"}
                </span>
              )}
            </div>

            <div className="membership-tier-price">
              {tier.price.toLocaleString("en-US")}
              <span> ريال / شهري</span>
            </div>

            <div className="membership-tier-details">
              <div className="membership-tier-detail-row">
                <span>{tier.discountPercentage}%</span>
                <span>الخصم</span>
              </div>
              <div className="membership-tier-detail-row">
                <span>{tier.memberCount}</span>
                <span>عدد الأعضاء</span>
              </div>
            </div>

            <div className="membership-tier-actions">
              <button
                type="button"
                className="membership-tier-view-btn"
                onClick={() => setViewingTierKey(tier.tierKey)}
              >
                عرض الأعضاء
              </button>
              <button
                type="button"
                className="membership-tier-edit-btn"
                onClick={() => setEditingTier(tier)}
              >
                تعديل الباقة
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="memberships-recent-card">
        <h3 className="memberships-recent-title">المشتركون الجدد</h3>

        {subscribers.length === 0 ? (
          <p className="reports-empty-note">لا يوجد مشتركون جدد بعد</p>
        ) : (
          <div className="memberships-recent-list">
            {subscribers.map((sub) => (
              <div className="memberships-recent-row" key={sub.id}>
                <div className="memberships-recent-info">
                  <span className="memberships-recent-avatar">
                    <FiUser />
                  </span>
                  <div>
                    <span className="memberships-recent-name">
                      {sub.fullName}
                    </span>
                    <span className="memberships-recent-email">
                      {sub.email}
                    </span>
                  </div>
                </div>
                <div className="memberships-recent-meta">
                  <span className="memberships-recent-tier">
                    {sub.tierName}
                  </span>
                  <span className="memberships-recent-date">
                    {formatDate(sub.assignedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTier && (
        <MembershipTierEditModal
          tier={editingTier}
          onClose={() => setEditingTier(null)}
          onSaved={fetchOverview}
        />
      )}

      {viewingTier && (
        <MembershipMembersModal
          tierKey={viewingTier.tierKey}
          tierName={viewingTier.displayName}
          onClose={() => setViewingTierKey(null)}
          onChanged={fetchOverview}
        />
      )}

      {showAssignModal && (
        <AssignMembershipModal
          onClose={() => setShowAssignModal(false)}
          onAssigned={async () => {
            setShowAssignModal(false);
            await fetchOverview();
          }}
        />
      )}
    </div>
  );
};

export default Memberships;

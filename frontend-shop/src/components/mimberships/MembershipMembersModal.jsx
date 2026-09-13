import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiUser, FiUserX, FiPlus } from "react-icons/fi";
import { API_URL } from "../../config/api";
import { formatDate } from "../../utils/formatDate";
import AssignMembershipModal from "./AssignMembershipModal";

/*
  MembershipMembersModal
  ------------------------------------------------------------------
  قائمة أعضاء باقة معيّنة (زر "عرض الأعضاء" بكل بطاقة) - مع إمكانية
  إزالة عضو (يرجّعه للعضوية المجانية تلقائيًا) أو إضافة عضو جديد لنفس
  الباقة مباشرة (بيفتح AssignMembershipModal بالباقة محددة مسبقًا)
*/
const MembershipMembersModal = ({ tierKey, tierName, onClose, onChanged }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/admin/memberships/${tierKey}/members`,
        {
          credentials: "include",
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل قائمة الأعضاء");
        return;
      }

      setMembers(result.members);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [tierKey]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRemove = async (member) => {
    if (
      !window.confirm(
        `هل أنت متأكد من إزالة "${member.fullName}" من هذه الباقة؟ رح يرجع للعضوية المجانية تلقائيًا.`,
      )
    ) {
      return;
    }

    setRemovingId(member.id);
    try {
      const res = await fetch(`${API_URL}/admin/memberships/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerId: member.id, tierKey: "free" }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إزالة العضو");
        return;
      }

      toast.success("تم إرجاع الزبون للعضوية المجانية");
      await fetchMembers();
      onChanged?.();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <div className="advanced-filter-modal-overlay" onClick={onClose}>
        <div
          className="advanced-filter-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="advanced-filter-modal-header">
            <h3>أعضاء {tierName}</h3>
            <button type="button" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <div className="advanced-filter-modal-body">
            <button
              type="button"
              className="membership-add-member-btn"
              onClick={() => setShowAssignModal(true)}
            >
              <FiPlus /> إضافة عضو لهذه الباقة
            </button>

            {loading ? (
              <p className="categories-loading">جاري التحميل...</p>
            ) : members.length === 0 ? (
              <p className="reports-empty-note">
                لا يوجد أعضاء بهذه الباقة بعد
              </p>
            ) : (
              <div className="membership-members-list">
                {members.map((member) => (
                  <div className="membership-member-row" key={member.id}>
                    <div className="membership-member-info">
                      <span className="membership-member-avatar">
                        <FiUser />
                      </span>
                      <div>
                        <span className="membership-member-name">
                          {member.fullName}
                        </span>
                        <span className="membership-member-meta" dir="ltr">
                          {member.phone}
                        </span>
                      </div>
                    </div>
                    <div className="membership-member-actions">
                      <span className="membership-member-date">
                        {member.assignedAt
                          ? formatDate(member.assignedAt)
                          : "—"}
                      </span>
                      <button
                        type="button"
                        className="membership-remove-member-btn"
                        onClick={() => handleRemove(member)}
                        disabled={removingId === member.id}
                        title="إزالة من الباقة"
                      >
                        <FiUserX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignMembershipModal
          defaultTierKey={tierKey}
          onClose={() => setShowAssignModal(false)}
          onAssigned={async () => {
            setShowAssignModal(false);
            await fetchMembers();
            onChanged?.();
          }}
        />
      )}
    </>
  );
};

export default MembershipMembersModal;

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiSearch, FiUser, FiCheck } from "react-icons/fi";
import { API_URL } from "../../config/api";

/*
  AssignMembershipModal
  ------------------------------------------------------------------
  تعيين/تغيير باقة عضوية زبون - نفس فلسفة AssignMarketerModal بالضبط
  (بحث عن زبون مسجَّل فعليًا بالاسم/الهاتف واختياره)، بس هون بعد
  الاختيار الأدمن بيحدد الباقة المطلوبة من قائمة (مش إدخال يدوي زي رمز
  الإحالة) - واختيار "العضوية المجانية" بيرجّع الزبون لها صراحة

  defaultTierKey (اختياري): لو المودال انفتح من داخل بطاقة باقة معيّنة
  ("عرض الأعضاء" → "إضافة عضو")، القائمة بتنفتح على هاي الباقة مسبقًا
*/
const AssignMembershipModal = ({ defaultTierKey, onClose, onAssigned }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [tierKey, setTierKey] = useState(defaultTierKey || "gold");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedCustomer) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/admin/memberships/customer-options?search=${encodeURIComponent(
            search,
          )}`,
          { credentials: "include" },
        );
        const result = await res.json();
        if (res.ok) setResults(result.customers || []);
      } catch (error) {
        // تجاهل - القائمة هتفضل فاضية والأدمن يقدر يعيد المحاولة
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, selectedCustomer]);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error("اختر الزبون المطلوب تعيينه أولًا");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/memberships/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          tierKey,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تعيين الباقة");
        return;
      }

      toast.success(result.message || "تم تحديث باقة الزبون بنجاح");
      onAssigned();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="advanced-filter-modal-overlay" onClick={onClose}>
      <div
        className="advanced-filter-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="advanced-filter-modal-header">
          <h3>تعيين عضوية لزبون</h3>
          <button type="button" onClick={onClose} disabled={saving}>
            <FiX />
          </button>
        </div>

        <div className="advanced-filter-modal-body">
          <div className="category-form-group">
            <label>الزبون</label>

            {selectedCustomer ? (
              <div className="affiliate-selected-customer">
                <span className="customers-table-avatar">
                  {selectedCustomer.fullName.charAt(0)}
                </span>
                <div className="affiliate-selected-customer-info">
                  <strong>{selectedCustomer.fullName}</strong>
                  <span dir="ltr">{selectedCustomer.phone}</span>
                  <span>باقته الحالية: {selectedCustomer.currentTierName}</span>
                </div>
                <button
                  type="button"
                  className="affiliate-change-customer-btn"
                  onClick={() => setSelectedCustomer(null)}
                >
                  تغيير
                </button>
              </div>
            ) : (
              <>
                <div className="product-picker-search">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="product-picker-list affiliate-picker-list">
                  {searching && (
                    <p className="product-picker-hint">جاري البحث...</p>
                  )}
                  {!searching && results.length === 0 && (
                    <p className="product-picker-hint">
                      لا توجد نتائج (تأكد إنه الزبون مسجَّل فعليًا بالمتجر)
                    </p>
                  )}
                  {results.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      className="product-picker-item affiliate-picker-item"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="product-picker-item-image">
                        <FiUser />
                      </div>
                      <div className="product-picker-item-info">
                        <span className="product-picker-item-name">
                          {customer.fullName}
                        </span>
                        <span className="product-picker-item-sku" dir="ltr">
                          {customer.phone}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="category-form-group">
            <label>الباقة المطلوبة</label>
            <select
              value={tierKey}
              onChange={(e) => setTierKey(e.target.value)}
            >
              <option value="gold">العضوية الذهبية</option>
              <option value="silver">العضوية الفضية</option>
              <option value="free">العضوية المجانية (إلغاء الترقية)</option>
            </select>
          </div>

          <button
            type="button"
            className="category-form-submit advanced-filter-modal-save-settings"
            onClick={handleSubmit}
            disabled={saving}
          >
            <FiCheck />
            {saving ? "جاري التعيين..." : "تأكيد التعيين"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignMembershipModal;

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiSearch, FiUser, FiCheck } from "react-icons/fi";
import { API_URL } from "../config/api";

/*
  AssignMarketerModal
  ------------------------------------------------------------------
  تعيين مسوّق جديد - على خطوتين بمودال واحد:
  1) البحث عن زبون مسجَّل فعليًا بالاسم أو الهاتف (GET
     /admin/marketers/customer-options - بيستثني تلقائيًا أي زبون
     مسوّق أصلاً) واختياره - نفس فلسفة CustomerPickerModal بالضبط بس
     اختيار واحد (Single-select) مش متعدد
  2) بعد الاختيار: إدخال رمز الإحالة يدويًا بالكامل (مش متولّد تلقائيًا -
     طلب صريح) + نسبة العمولة

  ⚠️ ما في إنشاء حساب جديد من هون أبدًا - لو الشخص المطلوب تعيينه مش
  مسجَّل بالمتجر أصلاً، لازم يسجّل حساب عادي بالموقع أولًا زي أي زبون
*/
const AssignMarketerModal = ({ onClose, onAssigned }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [code, setCode] = useState("");
  const [commissionPercentage, setCommissionPercentage] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedCustomer) return; // ما في داعي نبحث لو أصلاً في زبون مختار

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/admin/marketers/customer-options?search=${encodeURIComponent(
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
      toast.error("اختر الزبون المطلوب تعيينه كمسوّق أولًا");
      return;
    }
    if (!code.trim()) {
      toast.error("رمز الإحالة مطلوب");
      return;
    }
    const commission = Number(commissionPercentage);
    if (!commission || commission <= 0 || commission > 100) {
      toast.error("نسبة العمولة يجب أن تكون بين 1 و100");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/marketers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          code: code.trim(),
          commissionPercentage: commission,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تعيين المسوّق");
        return;
      }

      toast.success(result.message || "تم تعيين المسوّق بنجاح");
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
          <h3>إضافة مسوّق جديد</h3>
          <button type="button" onClick={onClose}>
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
                  {selectedCustomer.email && (
                    <span>{selectedCustomer.email}</span>
                  )}
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
                      لا توجد نتائج (تأكد إنه الزبون مسجَّل فعليًا بالمتجر ومش
                      مسوّق أصلاً)
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

          <div className="advanced-filter-modal-two-cols">
            <div className="category-form-group">
              <label>رمز الإحالة</label>
              <input
                type="text"
                placeholder="مثال: TARAZ-خالد"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="category-form-group">
              <label>نسبة العمولة (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(e.target.value)}
              />
            </div>
          </div>
          <p className="shipping-zone-modal-hint">
            بيحصل المسوّق على {commissionPercentage || 0}% من كل عملية بيع
            تستخدم رمزه
          </p>

          <button
            type="button"
            className="category-form-submit advanced-filter-modal-save-settings"
            onClick={handleSubmit}
            disabled={saving}
          >
            <FiCheck />
            {saving ? "جاري التعيين..." : "تعيين المسوّق"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignMarketerModal;

import React, { useState } from "react";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { API_URL } from "../../config/api";
import ToggleSwitch from "./../ToggleSwitch";

/*
  MembershipTierEditModal
  ------------------------------------------------------------------
  تعديل قيم باقة موجودة - ⚠️ لا يوجد أي حقل لتغيير tierKey أو حذف
  الباقة هون إطلاقًا (العدد ثابت 3 دايمًا، شوف شرح كامل بـ
  models/membershipTier.js)

  ⚠️ مفتاح "الحساب نشط" (isActive) بيختفي كليًا لو الباقة "free" - معاملة
  كسلوك طبيعي ثابت دايمًا بطلب صريح من صاحب المشروع، حتى الباك إند
  برضو بيرفض إيقافها لو حاول حدا (شوف adminMembership.controller.js)
*/
const MembershipTierEditModal = ({ tier, onClose, onSaved }) => {
  const [displayName, setDisplayName] = useState(tier.displayName);
  const [price, setPrice] = useState(tier.price);
  const [discountPercentage, setDiscountPercentage] = useState(
    tier.discountPercentage,
  );
  const [minPurchaseForDiscount, setMinPurchaseForDiscount] = useState(
    tier.minPurchaseForDiscount,
  );
  const [freeShippingMinOrder, setFreeShippingMinOrder] = useState(
    tier.freeShippingMinOrder,
  );
  const [allowStacking, setAllowStacking] = useState(tier.allowStacking);
  const [earlyAccessDelayHours, setEarlyAccessDelayHours] = useState(
    tier.earlyAccessDelayHours,
  );
  const [isActive, setIsActive] = useState(tier.isActive);
  const [saving, setSaving] = useState(false);

  const isFreeTier = tier.tierKey === "free";

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error("اسم الباقة مطلوب");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/memberships/${tier.tierKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: displayName.trim(),
          price: Number(price) || 0,
          discountPercentage: Number(discountPercentage) || 0,
          minPurchaseForDiscount: Number(minPurchaseForDiscount) || 0,
          freeShippingMinOrder: Number(freeShippingMinOrder) || 0,
          allowStacking,
          earlyAccessDelayHours: Number(earlyAccessDelayHours) || 0,
          isActive: isFreeTier ? true : isActive,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ التعديلات");
        return;
      }

      toast.success(result.message);
      await onSaved();
      onClose();
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
          <h3>تعديل {tier.displayName}</h3>
          <button type="button" onClick={onClose} disabled={saving}>
            <FiX />
          </button>
        </div>

        <div className="advanced-filter-modal-body">
          <div className="advanced-filter-modal-two-cols">
            <div className="category-form-group">
              <label>اسم الباقة المعروض</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="category-form-group">
              <label>السعر المرجعي (ريال / شهري)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <p className="shipping-zone-modal-hint">
            السعر عرضي بس للزبون - النظام ما بيحاسب ولا يجدّد عليه تلقائيًا،
            التفعيل والإلغاء كله يدوي من الإدارة
          </p>

          <div className="membership-edit-section">
            <h4>ميزة الخصم على الطلب</h4>
            <div className="advanced-filter-modal-two-cols">
              <div className="category-form-group">
                <label>نسبة الخصم (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                />
              </div>
              <div className="category-form-group">
                <label>الحد الأدنى للشراء (ل.س)</label>
                <input
                  type="number"
                  min={0}
                  value={minPurchaseForDiscount}
                  onChange={(e) => setMinPurchaseForDiscount(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="membership-edit-section">
            <h4>ميزة التوصيل المجاني</h4>
            <div className="category-form-group">
              <label>الحد الأدنى لقيمة الطلب (ل.س)</label>
              <input
                type="number"
                min={0}
                value={freeShippingMinOrder}
                onChange={(e) => setFreeShippingMinOrder(e.target.value)}
              />
            </div>
            <label className="advanced-filter-modal-toggle-row">
              <span>يمكن الجمع بين الخصم والتوصيل المجاني معًا</span>
              <ToggleSwitch
                checked={allowStacking}
                onChange={setAllowStacking}
              />
            </label>
            <p className="shipping-zone-modal-hint">
              لو معطّل، وتحقق الشرطين سوا بنفس الطلب، بيتطبق تلقائيًا الأنفع
              للزبون بالريال بس (مش الاثنين)
            </p>
          </div>

          <div className="membership-edit-section">
            <h4>ميزة الوصول المبكر</h4>
            <div className="category-form-group">
              <label>ساعات التأخير قبل ظهور منتجات "للأعضاء فقط"</label>
              <input
                type="number"
                min={0}
                value={earlyAccessDelayHours}
                onChange={(e) => setEarlyAccessDelayHours(e.target.value)}
              />
            </div>
            <p className="shipping-zone-modal-hint">
              صفر = وصول فوري لحظة نشر المنتج. بتخص بس منتجات معلَّمة "للأعضاء
              فقط" من ويزارد المنتج - باقي المنتجات تظهر فورًا للجميع دايمًا
            </p>
          </div>

          {!isFreeTier && (
            <label className="advanced-filter-modal-toggle-row">
              <span>الباقة مفعّلة</span>
              <ToggleSwitch checked={isActive} onChange={setIsActive} />
            </label>
          )}
          {isFreeTier && (
            <p className="shipping-zone-modal-hint">
              العضوية المجانية سلوك أساسي بالمتجر ولا يمكن إيقافها بالكامل
            </p>
          )}

          <button
            type="button"
            className="category-form-submit advanced-filter-modal-save-settings"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembershipTierEditModal;

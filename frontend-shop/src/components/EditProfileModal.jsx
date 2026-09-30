import React, { useState } from "react";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { API_URL } from "../config/api";

/*
  EditProfileModal
  ------------------------------------------------------------------
  تعديل بيانات الملف الشخصي (الاسم، اسم المتجر، الإيميل، الهاتف، النبذة)
  - نفس نمط مودال منطقة الشحن (ShippingZoneModal) بالضبط: نفس كلاسات
    الـ overlay/الهيدر (advanced-filter-modal-*) ونفس كلاس زر الحفظ
    (category-form-submit + advanced-filter-modal-save-settings)

  ⚠️ ما فيها حقل كلمة مرور - تغيير كلمة المرور له كارت وراوت مستقلين
  تمامًا (PATCH /api/store/password) بشرط التحقق من كلمة المرور الحالية،
  شوف شرح store.controller.js → changePassword

  onSaved: async - بتتنادى بعد نجاح الحفظ (الصفحة الأب بتعمل refetch
  لتحديث بيانات AuthContext فورًا)
*/
const EditProfileModal = ({ store, onClose, onSaved }) => {
  const [fullName, setFullName] = useState(store.fullName || "");
  const [storeName, setStoreName] = useState(store.storeName || "");
  const [email, setEmail] = useState(store.email || "");
  const [phone, setPhone] = useState(store.phone || "");
  const [bio, setBio] = useState(store.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (
      !fullName.trim() ||
      !storeName.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      toast.error("الاسم واسم المتجر والإيميل والهاتف كلها مطلوبة");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/store`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim(),
          storeName: storeName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
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
          <h3>تعديل الملف الشخصي</h3>
          <button type="button" onClick={onClose} disabled={saving}>
            <FiX />
          </button>
        </div>

        <div className="advanced-filter-modal-body">
          <div className="profile-form-group">
            <label>الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="profile-form-group">
            <label>اسم المتجر</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div className="advanced-filter-modal-two-cols">
            <div className="profile-form-group">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="profile-form-group">
              <label>رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-form-group">
            <label>نبذة شخصية (اختياري)</label>
            <textarea
              rows={3}
              maxLength={300}
              placeholder="نبذة قصيرة تظهر بالملف الشخصي"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

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

export default EditProfileModal;

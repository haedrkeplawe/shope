import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";

/*
  GeneralSettingsTab
  ------------------------------------------------------------------
  تبويب "عام" بصفحة الإعدادات - اسم المتجر/الإيميل/الهاتف العامين بس
  (storeName/email/phone) - عن قصد بلا fullName أو bio (هدول حقول
  هوية المالك الشخصية، بتضل حصرية بصفحة "الملف الشخصي" بس)

  ⚠️ ليش مودال منفصل عن EditProfileModal بدل إعادة استخدامه: لو موظف
  عنده صلاحية "settings" بس (مش مالك) فتح EditProfileModal، حقل
  fullName فيه كان رح يترسم بقيمة اسم الموظف نفسه (لأنه AuthContext.store
  بيمثّل حساب الموظف وقتها، مش حساب المتجر) - وبالحفظ كان رح يستبدل اسم
  صاحب المتجر الحقيقي باسم الموظف! هالمكوّن بيجيب بيانات المتجر دايمًا
  من GET /api/store (مصدر مستقل عن هوية مين فاتح الصفحة) ويعدّل عليها
  حصرًا، بلا أي لبس بين "هوية المالك" و"بيانات المتجر العامة"
*/
const GeneralSettingsTab = () => {
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStoreInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/store`);
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات المتجر");
        return;
      }

      setStoreInfo(result.store);
      setStoreName(result.store.storeName || "");
      setEmail(result.store.email || "");
      setPhone(result.store.phone || "");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreInfo();
  }, [fetchStoreInfo]);

  const handleCancel = () => {
    setStoreName(storeInfo?.storeName || "");
    setEmail(storeInfo?.email || "");
    setPhone(storeInfo?.phone || "");
    setEditing(false);
  };

  const handleSave = async () => {
    if (!storeName.trim() || !email.trim() || !phone.trim()) {
      toast.error("كل الحقول مطلوبة");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/store`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          storeName: storeName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ التعديلات");
        return;
      }

      toast.success(result.message);
      setEditing(false);
      await fetchStoreInfo();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (editing) {
    return (
      <div className="settings-general-tab">
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

        <div className="staff-modal-actions">
          <button
            type="button"
            className="staff-cancel-btn"
            onClick={handleCancel}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="category-form-submit advanced-filter-modal-save-settings"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-general-tab">
      <div className="settings-general-row">
        <span className="settings-general-label">اسم المتجر</span>
        <span className="settings-general-value">
          {storeInfo?.storeName || "—"}
        </span>
      </div>
      <div className="settings-general-row">
        <span className="settings-general-label">البريد الإلكتروني</span>
        <span className="settings-general-value">
          {storeInfo?.email || "—"}
        </span>
      </div>
      <div className="settings-general-row">
        <span className="settings-general-label">رقم الجوال</span>
        <span className="settings-general-value">
          {storeInfo?.phone || "—"}
        </span>
      </div>
      <button
        type="button"
        className="category-form-submit advanced-filter-modal-save-settings"
        onClick={() => setEditing(true)}
      >
        تعديل البيانات
      </button>
    </div>
  );
};

export default GeneralSettingsTab;

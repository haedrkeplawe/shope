import React, { useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiTrash2 } from "react-icons/fi";
import { API_URL } from "../config/api";
import ToggleSwitch from "./ToggleSwitch";

/*
  StaffFormModal
  ------------------------------------------------------------------
  إضافة موظف جديد (staff=null) أو تعديل موظف موجود (staff=object) -
  نفس نمط مودال منطقة الشحن (advanced-filter-modal-*) بالضبط

  الصلاحيات معروضة كـ checkboxes مبنية من permissionKeys/permissionLabels
  الجايين من الأب (StaffRolesTab) - مصدرهم الحقيقي الوحيد الباك إند
  (utils/permissions.js عبر GET /api/staff) - الفرونت ما بيكرر القائمة
  يدويًا بأي مكان

  ⚠️ رقم الهاتف مش قابل للتعديل بوضع "تعديل" عن قصد - هو المعرّف
  المستخدم لتسجيل الدخول، وتغييره بعد الإنشاء له تبعات (رسائل OTP...)
  - لو احتاج الأدمن يغيّره فعليًا، الأسهل حذف الموظف وإضافته من جديد
*/
const StaffFormModal = ({
  staff,
  permissionKeys,
  permissionLabels,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(staff);

  const [fullName, setFullName] = useState(staff?.fullName || "");
  const [phone, setPhone] = useState(staff?.phone || "");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState(staff?.jobTitle || "");
  const [permissions, setPermissions] = useState(() => {
    const initial = {};
    permissionKeys.forEach((key) => {
      initial[key] = Boolean(staff?.permissions?.[key]);
    });
    return initial;
  });
  const [status, setStatus] = useState(staff?.status || "active");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allGranted = permissionKeys.every((key) => permissions[key]);
  const busy = saving || deleting;

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const next = {};
    permissionKeys.forEach((key) => {
      next[key] = !allGranted;
    });
    setPermissions(next);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!isEdit && !phone.trim()) {
      toast.error("رقم الجوال مطلوب");
      return;
    }
    if (!isEdit && (!password || password.length < 6)) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (isEdit && password && password.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      jobTitle: jobTitle.trim(),
      permissions,
      ...(isEdit ? { status } : { phone: phone.trim() }),
      ...(password ? { password } : {}),
    };

    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/staff${isEdit ? `/${staff.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حفظ بيانات الموظف");
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

  const handleDelete = async () => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف "${staff.fullName}"؟ هذا الإجراء لا يمكن التراجع عنه، وبيفقد وصوله للوحة التحكم فورًا.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/staff/${staff.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف الموظف");
        return;
      }

      toast.success(result.message);
      await onSaved();
      onClose();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="advanced-filter-modal-overlay" onClick={onClose}>
      <div
        className="advanced-filter-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="advanced-filter-modal-header">
          <h3>{isEdit ? `تعديل: ${staff.fullName}` : "إضافة موظف جديد"}</h3>
          <button type="button" onClick={onClose} disabled={busy}>
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

          <div className="advanced-filter-modal-two-cols">
            <div className="profile-form-group">
              <label>رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isEdit}
                placeholder={isEdit ? "" : "09XXXXXXXX"}
              />
            </div>
            <div className="profile-form-group">
              <label>المسمى الوظيفي (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: مسؤول مشتريات"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-form-group">
            <label>
              {isEdit ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
            </label>
            <input
              type="password"
              placeholder={
                isEdit ? "اتركها فاضية لو ما بدك تغييرها" : "********"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isEdit && (
            <label className="advanced-filter-modal-toggle-row">
              <span>الحساب نشط</span>
              <ToggleSwitch
                checked={status === "active"}
                onChange={(checked) =>
                  setStatus(checked ? "active" : "suspended")
                }
              />
            </label>
          )}

          <div className="staff-permissions-section">
            <div className="staff-permissions-header">
              <label>الصلاحيات - الصفحات المسموح له الوصول إليها</label>
              <button
                type="button"
                className="staff-toggle-all-btn"
                onClick={toggleAll}
              >
                {allGranted ? "إلغاء الكل" : "منح كل الصلاحيات"}
              </button>
            </div>
            <div className="staff-permissions-grid">
              {permissionKeys.map((key) => (
                <label className="staff-permission-checkbox" key={key}>
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={() => togglePermission(key)}
                  />
                  {permissionLabels[key] || key}
                </label>
              ))}
            </div>
          </div>

          <div className="staff-modal-actions">
            {isEdit && (
              <button
                type="button"
                className="staff-delete-btn"
                onClick={handleDelete}
                disabled={busy}
              >
                <FiTrash2 /> {deleting ? "جاري الحذف..." : "حذف الموظف"}
              </button>
            )}
            <button
              type="button"
              className="category-form-submit advanced-filter-modal-save-settings"
              onClick={handleSubmit}
              disabled={busy}
            >
              {saving
                ? "جاري الحفظ..."
                : isEdit
                ? "حفظ التعديلات"
                : "إضافة الموظف"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffFormModal;

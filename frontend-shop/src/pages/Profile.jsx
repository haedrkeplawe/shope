import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiEdit2,
  FiCamera,
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheck,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import EditProfileModal from "../components/EditProfileModal";

/*
  Profile (الملف الشخصي)
  ------------------------------------------------------------------
  صفحة شخصية لصاحب المتجر - النظام فيه حساب أدمن واحد بس (شوف موديل
  Store)، فمفيش "قائمة مستخدمين" هون، بس ملف شخصي واحد للحساب الوحيد.

  ⚠️ عن قصد مش جزء من NAV_ITEMS بالشريط الجانبي - نفس نمط صفحات "حسابي"
  بمعظم لوحات التحكم (بتتفتح من أيقونة المستخدم بالـ TopBar، مش من
  القائمة الرئيسية). الراوت /profile مضاف يدويًا بـ App.js لهالسبب

  كارتين مستقلّين كليًا عن بعض بالباك إند (راوتس مختلفة، منطق مختلف):
  1) كارت المعلومات: اسم/بيو/تواصل + صورة شخصية (رفع فوري لحظة الاختيار،
     شوف handleAvatarChange) + زر "تعديل" (بيفتح EditProfileModal)
  2) كارت الأمان: تغيير كلمة المرور فقط - PATCH /store/password، بيتطلب
     كلمة المرور الحالية (تحقق فعلي بالباك إند، مش مجرد واجهة) - شوف
     شرح كامل بـ store.controller.js → changePassword
*/
const Profile = () => {
  const { store, refetch } = useAuth();
  const fileInputRef = useRef(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleAvatarClick = () => {
    if (!uploadingAvatar) fileInputRef.current?.click();
  };

  // رفع فوري لحظة اختيار الصورة - إجراء مستقل عن مودال "تعديل" (بدون
  // خطوة حفظ إضافية)، نفس فكرة كتير لوحات تحكم بتتعامل مع الصورة الشخصية
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const res = await fetch(`${API_URL}/store/avatar`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث الصورة الشخصية");
        return;
      }

      toast.success(result.message);
      await refetch();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("الرجاء تعبئة كل الحقول");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير مطابقة للتأكيد");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/store/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تغيير كلمة المرور");
        return;
      }

      toast.success(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!store) return null;

  return (
    <div className="profile-page">
      {/* الهيدر */}
      <div className="profile-header">
        <div>
          <h1 className="profile-title">الملف الشخصي</h1>
          <p className="profile-subtitle">
            إدارة معلوماتك الشخصية وإعدادات الحساب
          </p>
        </div>
      </div>

      {/* كارت المعلومات الشخصية */}
      <div className="profile-info-card">
        <div className="profile-cover">
          <button
            type="button"
            className="profile-edit-btn"
            onClick={() => setShowEditModal(true)}
          >
            <FiEdit2 /> تعديل
          </button>

          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {store.avatar ? (
                <img src={getImageUrl(store.avatar)} alt={store.fullName} />
              ) : (
                <FiUser />
              )}
              {uploadingAvatar && <span className="profile-avatar-loading" />}
            </div>
            <button
              type="button"
              className="profile-avatar-camera-btn"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              title="تغيير الصورة الشخصية"
            >
              <FiCamera />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              hidden
            />
          </div>
        </div>

        <div className="profile-info-body">
          <h2 className="profile-name">{store.fullName}</h2>
          <p className="profile-role">مدير المتجر</p>
          {store.bio && <p className="profile-bio">{store.bio}</p>}

          <div className="profile-contact-row">
            <span className="profile-contact-item">
              {store.email}
              <FiMail />
            </span>
            <span className="profile-contact-item">
              {store.phone}
              <FiPhone />
            </span>
          </div>
        </div>
      </div>

      {/* كارت الأمان وكلمة المرور */}
      <div className="profile-security-card">
        <h3 className="profile-security-title">
          <FiLock /> الأمان وكلمة المرور
        </h3>

        <form className="profile-password-form" onSubmit={handleChangePassword}>
          <div className="profile-form-group">
            <label>كلمة المرور الحالية</label>
            <div className="auth-input-wrapper">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="********"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <FiLock className="auth-input-icon" />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowCurrent((prev) => !prev)}
              >
                {showCurrent ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="profile-form-two-cols">
            <div className="profile-form-group">
              <label>كلمة المرور الجديدة</label>
              <div className="auth-input-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="********"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <FiLock className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowNew((prev) => !prev)}
                >
                  {showNew ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="profile-form-group">
              <label>تأكيد كلمة المرور</label>
              <div className="auth-input-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <FiLock className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="profile-change-password-btn"
            disabled={changingPassword}
          >
            <FiCheck />
            {changingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </button>
        </form>
      </div>

      {showEditModal && (
        <EditProfileModal
          store={store}
          onClose={() => setShowEditModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
};

export default Profile;

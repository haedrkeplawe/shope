import React, { useState } from "react";
import { FiX, FiLogOut } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

/*
  LogoutConfirmModal
  ------------------------------------------------------------------
  مودال تأكيد تسجيل الخروج من لوحة التحكم - بيتفعّل من زر "تسجيل الخروج"
  بأسفل الشريط الجانبي (Sidebar.jsx). مودال بسيط مستقل (مش مبني على
  advanced-filter-modal العام لأنه هيدا شكل مختلف كليًا - كارد صغير
  للتأكيد بس، مش فورم) بس بنفس فلسفة الـ overlay المستخدمة بباقي مودالات
  النظام (خلفية معتمة + إغلاق بالنقر برّا الكارد أو بزر X)

  ⚠️ ملاحظة RTL: الصفحة كلها dir="rtl" (من DashboardLayout) - بترتيب
  الأزرار "إلغاء" ثم "تسجيل الخروج" بالـ JSX (مش العكس) عشان زر التأكيد
  الأحمر يطلع شمال وزر الإلغاء يمين، بنفس تصميم المرجع بالضبط - نفس
  المبدأ المستخدم بترتيب أزرار CustomerPickerModal (إلغاء/تأكيد)

  بعد نجاح تسجيل الخروج، ما في داعي لأي navigate يدوي هون: store بتصير
  null بالـ AuthContext، وProtectedRoute بيتكفل بالتحويل لـ /login
  تلقائيًا (شوف ProtectedRoute.jsx) - نفس فلسفة "بدون تكرار منطق" المتبعة
  بكل النظام

  onClose: بتتنادى لإغلاق المودال بدون تسجيل خروج (زر إلغاء/X/النقر برّا)
*/
const LogoutConfirmModal = ({ onClose }) => {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // ما في داعي setLoggingOut(false) بحالة النجاح - الصفحة رح تتحول
      // لـ /login فورًا (ProtectedRoute) والمودال أصلاً بينشال من الشجرة.
      // بس لو صار خطأ شبكة غير متوقع بـ logout()، منرجع الزر قابل للاستخدام
      setLoggingOut(false);
    }
  };

  return (
    <div
      className="logout-modal-overlay"
      onClick={loggingOut ? undefined : onClose}
    >
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-header">
          <h3>تسجيل الخروج</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loggingOut}
            aria-label="إغلاق"
          >
            <FiX />
          </button>
        </div>

        <div className="logout-modal-body">
          <div className="logout-modal-warning">
            <span className="logout-modal-warning-icon">
              <FiLogOut />
            </span>
            <p>هل أنت متأكد من تسجيل الخروج من لوحة التحكم؟</p>
          </div>

          <div className="logout-modal-actions">
            <button
              type="button"
              className="logout-modal-cancel-btn"
              onClick={onClose}
              disabled={loggingOut}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="logout-modal-confirm-btn"
              onClick={handleConfirm}
              disabled={loggingOut}
            >
              {loggingOut ? "جاري تسجيل الخروج..." : "نعم، تسجيل الخروج"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;

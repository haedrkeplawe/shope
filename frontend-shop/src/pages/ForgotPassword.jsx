import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiPhone, FiArrowLeft, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

/*
  ForgotPassword (نسيت كلمة المرور - الخطوة الأولى)
  - موحّدة لحساب المالك وحسابات الموظفين سوا (نفس /store/login بالضبط -
    الباك إند بيحدد نوع الحساب تلقائيًا عن طريق findAccountByPhone)
  - بيطلب بس رقم الهاتف، وبيرسل رمز تحقق عبر SMS (نفس آلية OTP تسجيل
    الدخول بالضبط، بس بمسار مستقل POST /store/forgot-password - راجع
    شرح passwordResetOtp بموديلي Store/Staff وstore.controller.js)
  - بعد النجاح، بيوجّه لصفحة /reset-password مع تمرير رقم الهاتف (والرمز
    لو موجود بمرحلة الاختبار الحالية - SMS_DEBUG_MODE) عبر location.state
*/
const ForgotPassword = () => {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/store/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذر إرسال رمز التحقق");
        return;
      }

      toast.success(data.message || "تم إرسال رمز التحقق");
      navigate("/reset-password", { state: { phone, otp: data.otp } });
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-wrapper">
        <Link to="/login" className="auth-back-link">
          العودة لتسجيل الدخول
          <FiArrowLeft />
        </Link>

        <div className="auth-icon-badge">
          <FiLock />
        </div>

        <h1 className="auth-title">نسيت كلمة المرور؟</h1>
        <p className="auth-subtitle">
          أدخل رقم هاتفك المسجَّل وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور
        </p>

        <div className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label>رقم الهاتف</label>
              <div className="auth-input-wrapper">
                <input
                  type="tel"
                  placeholder="+963 9XX XXX XXX"
                  style={{ direction: "ltr", textAlign: "right" }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <FiPhone className="auth-input-icon" />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
            </button>
          </form>

          <p className="auth-footer-text">
            تذكّرت كلمة المرور؟{" "}
            <Link to="/login" className="auth-link-bold">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

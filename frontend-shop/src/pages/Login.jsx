import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
  FiShoppingBag,
} from "react-icons/fi";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

const Login = () => {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone || !password) {
      toast.error("الرجاء إدخال رقم الهاتف وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/store/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "حدث خطأ أثناء تسجيل الدخول");
        return;
      }

      toast.success(data.message || "تم إرسال رمز التحقق");
      navigate("/verify-otp", { state: { phone } });
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-wrapper">
        <div className="auth-icon-badge">
          <FiShoppingBag />
        </div>

        <h1 className="auth-title">مرحباً بعودتك</h1>
        <p className="auth-subtitle">سجل دخولك للوصول إلى لوحة التحكم</p>

        <div className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* رقم الهاتف */}
            <div className="auth-input-group">
              <label>رقم الهاتف</label>
              <div className="auth-input-wrapper">
                <input
                  type="tel"
                  placeholder="+966 5X XXX XXXX"
                  style={{ direction: "ltr", textAlign: "right" }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <FiPhone className="auth-input-icon" />
              </div>
            </div>

            {/* كلمة المرور */}
            <div className="auth-input-group">
              <label>كلمة المرور</label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <FiLock className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* نسيت كلمة المرور */}
            <div className="auth-row-end">
              <a href="#forgot" className="auth-link">
                نسيت كلمة المرور؟
              </a>
            </div>

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                "جاري تسجيل الدخول..."
              ) : (
                <>
                  <FiArrowLeft />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>أو</span>
          </div>

          <p className="auth-footer-text">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="auth-link-bold">
              أنشئ حسابًا جديداً
            </Link>
          </p>
        </div>

        <p className="auth-terms-note">
          بتسجيل الدخول أنت توافق على <a href="#terms">شروط الخدمة</a> و{" "}
          <a href="#privacy">سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  );
};

export default Login;

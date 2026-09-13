// user
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShoppingBag,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

/*
  Login (تسجيل الدخول)
  - نفس تصميم صفحة إنشاء الحساب بالضبط (auth-page/auth-card/auth-form)
    عشان يبقى شكل موحّد بين الشاشتين

  ⚠️ تحديث (ربط SMS فعلي): سابقًا كانت هاي الصفحة بتسلسل login ثم
  verify-otp تلقائيًا برمز dev bypass ثابت "123456" من غير ما تعرض أي
  شاشة تحقق للزبون. هلق بعد ربط Aman Gate فعليًا: أول تسجيل دخول للزبون
  بيتطلب فعليًا إدخال رمز OTP (شاشة /verify-otp) للتأكد من صلاحية رقمه -
  مرة وحدة بس. بعدها (isPhoneVerified صارت true بالباك إند)، أي تسجيل
  دخول لاحق بيصير مباشر بهاتف+كلمة مرور بس، بلا أي رمز إضافي - الباك إند
  هو يلي بيقرر هاد الفرق عن طريق حقل requiresVerification برد /customers/
  login (شوف loginCustomer بـcustomer.controller.js)
*/
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refetch } = useAuth();

  const [phone, setPhone] = useState(location.state?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone.trim() || !password) {
      toast.error("الرجاء إدخال رقم الهاتف وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const loginRes = await fetch(`${API_URL}/customers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        toast.error(loginData.message || "بيانات الدخول غير صحيحة");
        return;
      }

      // ✅ الرقم موثّق من قبل (نجح OTP مرة وحدة سابقًا) - الباك إند رجع
      // الجلسة مباشرة (كوكي customerToken) بدون رمز جديد - نفس تدفق
      // نهاية verify-otp بالضبط، بس هون قصير الطريق
      if (loginData.requiresVerification === false) {
        await refetch();
        toast.success(loginData.message || "تم تسجيل الدخول بنجاح");
        navigate("/");
        return;
      }

      toast.success(loginData.message || "تم إرسال رمز التحقق");
      // otp موجود بالرد بس بمرحلة الاختبار الحالية (SMS_DEBUG_MODE
      // بالباك إند) - منمرره لشاشة التحقق حتى تقدر تعرضه مباشرة للزبون
      navigate("/verify-otp", { state: { phone, otp: loginData.otp } });
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
        <p className="auth-subtitle">سجل دخولك إلى عالم الأناقة الفاخرة</p>

        <div className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* رقم الهاتف */}
            <div className="auth-input-group">
              <label>رقم الهاتف</label>
              <div className="auth-input-wrapper">
                <input
                  type="tel"
                  placeholder="+963 9XX XXX XXX أو 09XXXXXXXX"
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
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="auth-forgot-password-row">
              <Link to="/forgot-password" className="auth-link-bold">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <p className="auth-footer-text">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="auth-link-bold">
              أنشئ حسابًا جديداً
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

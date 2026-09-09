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

  ⚠️ قرار مهم: الباك إند (customer.controller.js) لسه مبني بخطوتين
  (login يولّد OTP ثم verify-otp يفعّل الجلسة فعليًا) - بنيناه هيك أصلاً
  بالأدمن، وسيبناه كما هو بالباك إند عشان ما نعيد هيكلته لما نربط مزود SMS
  حقيقي لاحقًا.

  بما إنك طلبت "تسجيل دخول بدون تحقق" (بدون ما الزبون يشوف شاشة OTP)،
  الحل الأنضف هون مش حذف خطوة الـ verify-otp من الباك إند، لأنه هيك
  منكسر تناسقه مع نظام الأدمن من غير داعي. الحل: نسلسل الطلبين تلقائيًا
  من الفرونت فقط (login ثم verify-otp برمز الـ dev bypass "123456"
  المعرّف أصلاً بالباك إند) من غير ما نعرض أي واجهة وسيطة للزبون - هو
  بيدخل هاتف + كلمة مرور وبس، وبيدخل مباشرة. لما نربط SMS حقيقي لاحقًا،
  بيصير لازم نضيف شاشة OTP حقيقية ونشيل هاد التسلسل التلقائي - نقطة
  واحدة واضحة للتعديل بدل ما تكون منتشرة بأكتر من مكان.
*/
const DEV_OTP_BYPASS = "123456";

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

      // تسلسل تلقائي لخطوة التحقق - غير ظاهر للزبون (راجع الملاحظة بالأعلى)
      const verifyRes = await fetch(`${API_URL}/customers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, code: DEV_OTP_BYPASS }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        toast.error(verifyData.message || "تعذر إتمام تسجيل الدخول");
        return;
      }

      await refetch();
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/");
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
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
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

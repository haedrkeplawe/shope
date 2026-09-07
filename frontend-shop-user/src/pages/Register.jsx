// user
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShoppingBag,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";

/*
  Register (إنشاء حساب جديد)
  - فورم إنشاء حساب زبون - هاتف + كلمة مرور فقط فعليًا مطلوبين للتشغيل
  - email حقل شكلي بس بالفورم، مش بيتبعت لأي منطق تحقق أو تفرّد
  - ما في تسجيل دخول عبر Google/Apple - التسجيل عبر الهاتف حصرًا، مطابق للأدمن
  - بعد الإنشاء، الزبون بيتوجه لصفحة تسجيل الدخول (نفس تدفق الأدمن: التسجيل
    والدخول خطوتين منفصلتين)
*/
const Register = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !password) {
      toast.error("الرجاء تعبئة الاسم الكامل ورقم الهاتف وكلمة المرور");
      return;
    }

    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    if (!agreedToTerms) {
      toast.error("لازم توافق على شروط الخدمة وسياسة الخصوصية");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/customers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "حدث خطأ أثناء إنشاء الحساب");
        return;
      }

      toast.success(data.message || "تم إنشاء الحساب بنجاح");
      navigate("/login", { state: { phone } });
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

        <h1 className="auth-title">إنشاء حساب جديد</h1>
        <p className="auth-subtitle">انضم إلى عالم الأناقة الفاخرة</p>

        <div className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* الاسم الكامل */}
            <div className="auth-input-group">
              <label>الاسم الكامل</label>
              <div className="auth-input-wrapper">
                <input
                  type="text"
                  placeholder="أدخل اسمك الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <FiUser className="auth-input-icon" />
              </div>
            </div>

            {/* البريد الإلكتروني (شكلي فقط) */}
            <div className="auth-input-group">
              <label>البريد الإلكتروني</label>
              <div className="auth-input-wrapper">
                <input
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FiMail className="auth-input-icon" />
              </div>
            </div>

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
                  placeholder="أنشئ كلمة مرور قوية"
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

            {/* تأكيد كلمة المرور */}
            <div className="auth-input-group">
              <label>تأكيد كلمة المرور</label>
              <div className="auth-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <FiLock className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* الموافقة على الشروط - بدون ربط فعلي لصفحات لسه */}
            <label className="auth-checkbox-row">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>أوافق على شروط الخدمة وسياسة الخصوصية</span>
            </label>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </button>
          </form>

          <p className="auth-footer-text">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="auth-link-bold">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

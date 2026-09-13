import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

/*
  ResetPassword (نسيت كلمة المرور - الخطوة الثانية)
  - خطوة واحدة بس: إدخال رمز التحقق (6 خانات، نفس شكل VerifyOtp) +
    كلمة مرور جديدة + تأكيدها - بيتحقق منهم كلهم دفعة واحدة بالباك إند
    (POST /store/reset-password - موحّد لحساب المالك والموظفين سوا)
  - otp هون بس تعبئة تلقائية اختيارية بمرحلة الاختبار الحالية
    (SMS_DEBUG_MODE) - المستخدم لسا لازم يضغط "تعيين كلمة المرور" بنفسه
*/
const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const phone = location.state?.phone;

  const [code, setCode] = useState(
    location.state?.otp ? location.state.otp.split("") : new Array(6).fill(""),
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);

  // لو دخل حد الصفحة مباشرة من غير ما يمر بخطوة "نسيت كلمة المرور"
  useEffect(() => {
    if (!phone) {
      navigate("/forgot-password");
    }
  }, [phone, navigate]);

  const handleCodeChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = code.join("");

    if (otp.length !== 6) {
      toast.error("الرجاء إدخال رمز التحقق كاملاً");
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast.error("الرجاء إدخال كلمة المرور الجديدة وتأكيدها");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/store/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذر إعادة تعيين كلمة المرور");
        return;
      }

      toast.success(data.message || "تم تعيين كلمة المرور الجديدة بنجاح");
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
        <Link to="/forgot-password" className="auth-back-link">
          العودة
          <FiArrowLeft />
        </Link>

        <div className="auth-icon-badge">
          <FiCheck />
        </div>

        <h1 className="auth-title">تعيين كلمة مرور جديدة</h1>
        <p className="auth-subtitle">أدخل رمز التحقق المرسل إلى</p>
        <p className="auth-highlight-value">{phone}</p>

        <div className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label className="auth-otp-label">رمز التحقق</label>
              <div className="auth-otp-inputs">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="auth-otp-box"
                    value={digit}
                    onChange={(e) => handleCodeChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                ))}
              </div>
            </div>

            <div className="auth-input-group">
              <label>كلمة المرور الجديدة</label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة مرور جديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : "تعيين كلمة المرور"}
            </button>
          </form>

          {location.state?.otp && (
            <div className="auth-note auth-note--info">
              رمز التجربة: <b>{location.state.otp}</b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

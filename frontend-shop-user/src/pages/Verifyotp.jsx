// user
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiCheck, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

/*
  VerifyOtp (تحقق من رقم الهاتف - تسجيل الدخول)
  - نفس تصميم/تدفق شاشة تحقق الأدمن بالضبط (2 خطوة: هاتف+كلمة مرور ثم
    OTP)، بس بمسارات /customers/* - قبل هيك كانت هاي الخطوة متسلسلة تلقائيًا
    وخفية عن الزبون من صفحة Login.jsx نفسها (dev bypass "123456" بدون
    عرض) - هلق بعد ربط SMS فعلي (Aman Gate)، لازم الزبون يشوفها ويدخل
    الرمز فعليًا متل الأدمن بالظبط

  ⚠️ otp الظاهر بالـlocation.state جاي من رد /customers/login مباشرة -
  موجود بس لأنه الباك إند بمرحلة الاختبار الحالية (SMS_DEBUG_MODE) عم
  يرجّعه صراحة بالرد، عشان نقدر نجرب بأرقام وهمية أو لو خلصت رسائل الباقة.
  لما ينشال SMS_DEBUG_MODE من الباك إند، otp هون رح يصير undefined دايمًا
  والصندوق التوضيحي تحت ما رح يظهر تلقائيًا - بلا أي تعديل إضافي هون
*/
const RESEND_SECONDS = 45;

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const phone = location.state?.phone;
  const [debugOtp, setDebugOtp] = useState(location.state?.otp || null);

  const [code, setCode] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputsRef = useRef([]);

  // لو دخل حد الصفحة مباشرة من غير ما يمر بخطوة تسجيل الدخول
  useEffect(() => {
    if (!phone) {
      navigate("/login");
    }
  }, [phone, navigate]);

  // العد التنازلي لإعادة الإرسال
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleChange = (value, index) => {
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

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = code.join("");

    if (otp.length !== 6) {
      toast.error("الرجاء إدخال رمز التحقق كاملاً");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/customers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, code: otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "رمز التحقق غير صحيح");
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح");
      await refetch();
      navigate("/");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await fetch(`${API_URL}/customers/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذر إعادة إرسال الرمز");
        return;
      }

      toast.success("تم إرسال رمز جديد");
      setDebugOtp(data.otp || null);
      setSecondsLeft(RESEND_SECONDS);
      setCode(new Array(6).fill(""));
      inputsRef.current[0]?.focus();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-wrapper">
        <Link to="/login" className="auth-back-link">
          العودة
          <FiArrowLeft />
        </Link>

        <div className="auth-icon-badge">
          <FiCheck />
        </div>

        <h1 className="auth-title">تحقق من رقم هاتفك</h1>
        <p className="auth-subtitle">أرسلنا رمز التحقق المكون من 6 أرقام إلى</p>
        <p className="auth-highlight-value">{phone}</p>

        <div className="auth-card">
          <form className="auth-form" onSubmit={handleVerify}>
            <div>
              <label className="auth-otp-label">أدخل رمز التحقق</label>
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
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                "جاري التحقق..."
              ) : (
                <>
                  <FiArrowLeft />
                  تحقق من الرمز
                </>
              )}
            </button>
          </form>

          <p className="auth-resend-text">
            {secondsLeft > 0 ? (
              <>
                يمكنك إعادة إرسال الرمز بعد <b>{secondsLeft} ثانية</b>
              </>
            ) : (
              <button
                type="button"
                className="auth-resend-btn"
                onClick={handleResend}
              >
                إعادة إرسال الرمز
              </button>
            )}
          </p>

          <div className="auth-note auth-note--warning">
            لم تستلم الرمز؟ تحقق من تغطية الشبكة لديك أو انتظر دقيقة قبل إعادة
            المحاولة
          </div>

          {/* ⚠️ يظهر بس بمرحلة الاختبار الحالية (SMS_DEBUG_MODE بالباك
              إند) - راجع الشرح بأعلى الملف */}
          {debugOtp && (
            <div className="auth-note auth-note--otp-debug">
              رمز التجربة: {debugOtp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;

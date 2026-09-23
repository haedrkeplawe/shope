// user
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
  ProtectedRoute (زبون)
  - نفس منطق نسخة الأدمن بالضبط - لو مش مسجل دخول بيرجعه لـ /login
  - ⚠️ تحديث الميزة الجديدة (تصفح بدون تسجيل دخول): بقى بيحمي بس الصفحات
    يلي فعليًا بتتطلب حساب (حسابي، إتمام الطلب، الطلبات، المفضلة،
    الإشعارات...) - مش كل الموقع متل قبل (شوف App.js لتفصيل كامل أي
    صفحات بقت عامة للزائر)
  - بيمرر مكان الصفحة الأصلية (state.from) لصفحة تسجيل الدخول - عشان لو
    الزائر مثلاً كان بصفحة /checkout وانرجّع لتسجيل الدخول، يرجعله لنفس
    الصفحة تلقائيًا بعد ما يسجّل دخول بدل ما يضيع دايمًا للرئيسية (شوف
    Login.jsx/Verifyotp.jsx)
*/
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

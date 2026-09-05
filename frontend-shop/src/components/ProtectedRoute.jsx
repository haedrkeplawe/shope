import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
  ProtectedRoute
  - لحد ما يوصل رد من "GET /store/me" منعرفش لو المستخدم مسجل دخول ولا لأ، فبنعرض شاشة تحميل بسيطة
  - لو مش مسجل دخول، بيرجعه لصفحة /login فورًا
  - لو مسجل دخول، بيعرض محتوى لوحة التحكم (Outlet)
*/
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

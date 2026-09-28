import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
  GuestRoute
  - عكس ProtectedRoute بالظبط
  - لو المستخدم مسجل دخول بالفعل، بيمنعه من الوصول لصفحات /login و /verify-otp
    وبيرجعه للوحة التحكم مباشرة
  - لو مش مسجل دخول، بيسيبه يكمل عادي (Outlet)
*/
const GuestRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;

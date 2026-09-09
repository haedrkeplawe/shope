// user
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
  ProtectedRoute (زبون)
  - نفس منطق نسخة الأدمن بالضبط - لو مش مسجل دخول بيرجعه لـ /login
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

// user
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
  GuestRoute (زبون)
  - لو الزبون مسجل دخول بالفعل، بيمنعه من /login و /register وبيرجعه للـ Home
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

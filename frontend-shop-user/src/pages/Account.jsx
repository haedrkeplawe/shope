// user
import { useNavigate, Link } from "react-router-dom";
import { FiUser, FiPackage, FiChevronLeft, FiLogOut } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

/*
  Account (حسابي)
  - صفحة حساب بسيطة وحقيقية بدل الـ ComingSoon - نطاقها محدود عن قصد
    (معلومات أساسية + مدخل لـ"طلباتي" + تسجيل خروج) لأنه ما في مزايا
    حساب تانية مبنية فعليًا لسه (تعديل بيانات، دفتر عناوين...) - جاهزة
    نضيف عليها صفوف تانية بنفس نمط "طلباتي" لاحقًا بسهولة
*/
const Account = () => {
  const navigate = useNavigate();
  const { customer, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="account-page">
      <h1 className="account-title">حسابي</h1>

      <div className="account-info-card">
        <span className="account-avatar">
          <FiUser />
        </span>
        <div>
          <h2>{customer?.fullName}</h2>
          <p>{customer?.phone}</p>
        </div>
      </div>

      <div className="account-menu">
        <Link to="/orders" className="account-menu-item">
          <span className="account-menu-item-right">
            <FiPackage /> طلباتي
          </span>
          <FiChevronLeft />
        </Link>
      </div>

      <button
        type="button"
        className="account-logout-btn"
        onClick={handleLogout}
      >
        <FiLogOut /> تسجيل الخروج
      </button>
    </div>
  );
};

export default Account;

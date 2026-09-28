import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiUser, FiLogOut } from "react-icons/fi";
import { NAV_ITEMS } from "../constants/navItems";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import LogoutConfirmModal from "./LogoutConfirmModal";

/*
  Sidebar
  - قابل للتوسعة والتضييق (عند التضييق بتظهر الأيقونات فقط)
  - حالة الطي جايه من SidebarContext (بيستخدمها هنا فقط حاليًا)
  - زر التحكم أيقونة مستقلة فوق قائمة الروابط
  - زر "تسجيل الخروج" بأسفل القائمة - بيفتح مودال تأكيد (LogoutConfirmModal)
    بدل ما يسجّل خروج مباشرة، منعًا لأي ضغطة غير مقصودة

  ⚠️ فلترة الصلاحيات: عنصر بلا permissionKey (زي "عرض المتجر") ظاهر
  دايمًا للجميع. عنصر عنده permissionKey بيظهر بس لو hasPermission(key)
  true - المالك بيشوف كل شي دايمًا، الموظف بس الصفحات المسموح له فيها.
  ⚠️ هاي فلترة تجميلية لتجربة الاستخدام بس - الحماية الحقيقية من محاولة
  الوصول المباشر (كتابة الرابط يدويًا) بالباك إند (requirePermission)
*/
const Sidebar = () => {
  const { store, isOwner, hasPermission } = useAuth();
  const { collapsed, toggleCollapsed } = useSidebar();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    ({ permissionKey }) => !permissionKey || hasPermission(permissionKey),
  );

  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        {/* بطاقة صاحب الحساب (مالك أو موظف) */}
        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar">
            <FiUser />
          </div>
          {!collapsed && (
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">
                {store?.fullName || "—"}
              </span>
              <span className="sidebar-profile-role">
                {isOwner ? "مدير المتجر" : store?.jobTitle || "موظف"}
              </span>
            </div>
          )}
        </div>

        {/* زر التوسعة/التضييق - أيقونة مستقلة فوق القائمة */}
        <button
          type="button"
          className="sidebar-toggle-icon"
          onClick={toggleCollapsed}
          title={collapsed ? "توسعة القائمة" : "تضييق القائمة"}
        >
          <FiMenu />
        </button>

        {/* القائمة - مفلترة حسب الصلاحيات */}
        <nav className="sidebar-nav">
          {visibleNavItems.map(({ label, path, icon: Icon, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? "sidebar-nav-item--active" : ""}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="sidebar-nav-icon" />
              {!collapsed && <span className="sidebar-nav-label">{label}</span>}
              {!collapsed && badge && (
                <span className="sidebar-nav-badge">{badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* زر تسجيل الخروج - ثابت بأسفل الشريط الجانبي */}
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={() => setShowLogoutModal(true)}
          title={collapsed ? "تسجيل الخروج" : undefined}
        >
          <FiLogOut className="sidebar-nav-icon" />
          {!collapsed && (
            <span className="sidebar-nav-label">تسجيل الخروج</span>
          )}
        </button>
      </aside>

      {showLogoutModal && (
        <LogoutConfirmModal onClose={() => setShowLogoutModal(false)} />
      )}
    </>
  );
};

export default Sidebar;

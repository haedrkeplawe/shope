import React from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiUser } from "react-icons/fi";
import { NAV_ITEMS } from "../constants/navItems";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";

/*
  Sidebar
  - قابل للتوسعة والتضييق (عند التضييق بتظهر الأيقونات فقط)
  - حالة الطي جايه من SidebarContext (بيستخدمها هنا فقط حاليًا)
  - زر التحكم أيقونة مستقلة فوق قائمة الروابط
*/
const Sidebar = () => {
  const { store } = useAuth();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      {/* بطاقة صاحب المتجر */}
      <div className="sidebar-profile">
        <div className="sidebar-profile-avatar">
          <FiUser />
        </div>
        {!collapsed && (
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              {store?.fullName || "—"}
            </span>
            <span className="sidebar-profile-role">مدير المتجر</span>
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

      {/* القائمة */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ label, path, icon: Icon, badge }) => (
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
    </aside>
  );
};

export default Sidebar;

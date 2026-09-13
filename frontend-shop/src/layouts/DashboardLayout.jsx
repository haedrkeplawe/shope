import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { SidebarProvider } from "../context/SidebarContext";

/*
  DashboardLayout
  - القسم الثابت (العلوي + الجانبي) اللي هيظهر في كل صفحات لوحة التحكم
  - محتوى كل صفحة بيتعرض مكان الـ <Outlet />
  - ملفوف بـ SidebarProvider عشان الشريط العلوي والجانبي يتشاركوا نفس حالة الطي
*/
const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <div className="dashboard-shell" dir="rtl">
        <TopBar />
        <div className="dashboard-body">
          <Sidebar />
          <main className="dashboard-content">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

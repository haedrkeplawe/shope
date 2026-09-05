// user
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import MobileMenu from "./MobileMenu";

/*
  MainLayout
  - بيلف حوالين كل صفحات الموقع بعد تسجيل الدخول: هيدر ثابت بالأعلى +
    قائمة منسدلة + محتوى الصفحة (Outlet) - بنفس فلسفة DashboardLayout بالأدمن
*/
const MainLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="site-layout">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="site-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

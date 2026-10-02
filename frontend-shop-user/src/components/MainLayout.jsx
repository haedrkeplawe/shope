// user
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileMenu from "./MobileMenu";
import BottomNav from "./BottomNav";

/*
  MainLayout
  - بيلف حوالين كل صفحات الموقع بعد تسجيل الدخول: هيدر ثابت بالأعلى +
    قائمة منسدلة + محتوى الصفحة (Outlet) + فوتر بالأسفل + شريط سفلي ثابت
    (BottomNav - جديد بالتصميم) - بنفس فلسفة DashboardLayout بالأدمن بالضبط
  - الفوتر جوّا نفس .site-layout الفليكس (عمودي، min-height:100vh) بعد
    <main> مباشرة - بما إنه site-content آخذ flex:1، الفوتر بيضل ملزوق
    بأسفل الشاشة حتى لو محتوى الصفحة قصير (صفحة فاضية مثلاً)، وبينزل
    تحت المحتوى طبيعي لما المحتوى يطول - بدون أي CSS إضافي أو position
    خاص، بس بفضل ترتيب الفليكس الموجود أصلاً
  - BottomNav عنصر position: fixed (مش جزء من تدفق الفليكس) فمكانه بالـ
    JSX مش مهم - حطيته آخر شي للوضوح بس. الفوتر مسؤول عن ترك مساحة
    سفلية تحته (footer.css) عشان آخر سطر بالفوتر ما يتغطّى
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

      <Footer />
      <BottomNav />
    </div>
  );
};

export default MainLayout;

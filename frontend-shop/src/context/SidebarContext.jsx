import React, { createContext, useContext, useState } from "react";

const SidebarContext = createContext(null);

/*
  SidebarProvider
  - بيمسك حالة (مطوي / مفتوح) الخاصة بالشريط الجانبي في مكان واحد
  - كده أي زر تحكم (سواء جوه السايدبار نفسه أو من الشريط العلوي) بيتحكم في نفس الحالة
  - الحالة محفوظة بالـ localStorage عشان تفضل زي ما سابها المستخدم بين الصفحات
*/
export const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);

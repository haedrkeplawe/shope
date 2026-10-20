import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import GeneralSettingsTab from "../components/GeneralSettingsTab";
import PaymentSettingsTab from "../components/PaymentSettingsTab";
import StaffRolesTab from "../components/StaffRolesTab";

/*
  Settings (الإعدادات)
  ------------------------------------------------------------------
  تبويب "عام" (بيانات المتجر العامة) وتبويب "الدفع" (تفعيل/تعطيل طرق
  الدفع + صورة QR تبع شام كاش) ظاهرين للجميع (المالك أو أي موظف عنده
  صلاحية "settings") - شوف requirePermission("settings") بـ
  store.routes.js. تبويب "الأدوار" (إدارة الموظفين والصلاحيات) ظاهر
  للمالك حصرًا وبس - ما إله علاقة بنظام الصلاحيات القابل للتفويض أبدًا
  (شوف requireOwner بـ middleware/authorize.js، ونفس القاعدة مطبّقة هون
  بالفرونت كمان: isOwner فقط، مش hasPermission)

  ⚠️ عن قصد ما بنيت تبويبي "الأمان" و"الشحن" اللي بالتصميم المرجعي:
  "الشحن" أصلاً له صفحة كاملة مستقلة (/shipping)، و"الأمان" (كلمة المرور)
  موجودة بصفحة "الملف الشخصي" (خاصة بالمالك أساسًا). تبويب "الدفع" كان
  فاضي لنفس السبب لحد ما تضاف طريقة شام كاش - هلق صار له محتوى حقيقي
  (PaymentSettingsTab)
*/
const Settings = () => {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { key: "general", label: "عام" },
    { key: "payments", label: "الدفع" },
    ...(isOwner ? [{ key: "roles", label: "الأدوار" }] : []),
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1 className="settings-title">الإعدادات</h1>
          <p className="settings-subtitle">
            إعدادات المتجر والأدوار والصلاحيات
          </p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`settings-tab ${
                activeTab === tab.key ? "settings-tab--active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-tab-content">
          {activeTab === "general" && <GeneralSettingsTab />}
          {activeTab === "payments" && <PaymentSettingsTab />}
          {activeTab === "roles" && isOwner && <StaffRolesTab />}
        </div>
      </div>
    </div>
  );
};

export default Settings;

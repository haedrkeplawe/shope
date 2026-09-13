import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiUser } from "react-icons/fi";
import { API_URL } from "../config/api";
import StaffFormModal from "./StaffFormModal";

/*
  StaffRolesTab
  ------------------------------------------------------------------
  تبويب "الأدوار" بصفحة الإعدادات - قائمة كل الموظفين/المساعدين +
  شارات صلاحياتهم + زر "إضافة موظف". ⚠️ الصفحة الأب (Settings.jsx) هي
  المسؤولة عن إخفاء هالتبويب بالكامل عن أي حساب مش المالك - هالمكوّن
  نفسه ما بيتحقق من isOwner، لأنه أصلاً route file الموظفين بالباك إند
  (staff.routes.js) محصور بالمالك حصرًا بغض النظر شو الفرونت بيعرض

  شارات الصلاحيات: لو الموظف عنده كل المفاتيح مفعّلة، شارة وحدة "كل
  الصلاحيات" بدل ما نعدد كل صفحة لحالها - نفس فكرة زر "منح كل الصلاحيات"
  بمودال الإضافة/التعديل بالضبط
*/
const StaffRolesTab = () => {
  const [staffList, setStaffList] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [permissionLabels, setPermissionLabels] = useState({});
  const [loading, setLoading] = useState(true);
  // undefined = المودال مغلق، null = وضع "إضافة"، object = وضع "تعديل"
  const [modalStaff, setModalStaff] = useState(undefined);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/staff`, { credentials: "include" });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل قائمة الموظفين");
        return;
      }

      setStaffList(result.staff);
      setPermissionKeys(result.permissionKeys);
      setPermissionLabels(result.permissionLabels);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const getPermissionBadges = (permissions) => {
    const grantedKeys = permissionKeys.filter((key) => permissions?.[key]);
    if (grantedKeys.length === 0) return ["بلا صلاحيات بعد"];
    if (grantedKeys.length === permissionKeys.length) return ["كل الصلاحيات"];
    return grantedKeys.map((key) => permissionLabels[key] || key);
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  return (
    <div className="staff-roles-tab">
      <div className="staff-roles-header">
        <p className="staff-roles-count">
          {staffList.length > 0
            ? `${staffList.length} موظف مضاف`
            : "لسه ما في موظفين مضافين"}
        </p>
        <button
          type="button"
          className="staff-add-btn"
          onClick={() => setModalStaff(null)}
        >
          <FiPlus /> إضافة موظف
        </button>
      </div>

      {staffList.length === 0 ? (
        <p className="reports-empty-note">
          أضف أول موظف/مساعد وحدد الصفحات المسموح له الوصول إليها
        </p>
      ) : (
        <div className="staff-list">
          {staffList.map((staff) => (
            <div className="staff-row" key={staff.id}>
              <div className="staff-row-info">
                <span className="staff-row-avatar">
                  <FiUser />
                </span>
                <div>
                  <span className="staff-row-name">
                    {staff.fullName}
                    {staff.status === "suspended" && (
                      <span className="staff-suspended-badge">معلّق</span>
                    )}
                  </span>
                  <span className="staff-row-title">
                    {staff.jobTitle || "بلا مسمى وظيفي"}
                  </span>
                </div>
              </div>

              <div className="staff-row-badges">
                {getPermissionBadges(staff.permissions).map((badge) => (
                  <span className="staff-badge" key={badge}>
                    {badge}
                  </span>
                ))}
                <button
                  type="button"
                  className="staff-edit-btn"
                  onClick={() => setModalStaff(staff)}
                >
                  تعديل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalStaff !== undefined && (
        <StaffFormModal
          staff={modalStaff}
          permissionKeys={permissionKeys}
          permissionLabels={permissionLabels}
          onClose={() => setModalStaff(undefined)}
          onSaved={fetchStaff}
        />
      )}
    </div>
  );
};

export default StaffRolesTab;

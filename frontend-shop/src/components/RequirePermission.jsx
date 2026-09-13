import React from "react";
import { useAuth } from "../context/AuthContext";

/*
  RequirePermission
  ------------------------------------------------------------------
  طبقة حماية إضافية على مستوى الراوت بالفرونت - دفاع مضاعف (Defense in
  Depth)، مش بديل عن حماية الباك إند. لو موظف كتب رابط صفحة يدويًا مش
  مسموح له فيها (بعد ما اختفت من الشريط الجانبي أصلاً)، هاي الطبقة
  بتمنع عرض الصفحة بدل ما تطلع فاضية أو مكسورة من فشل كل نداءات الـ API
  (يلي أصلاً هترفضهم requirePermission بالباك إند بأي الحالات - هون بس
  تجربة استخدام أنظف)

  استخدامين:
  - permissionKey="orders": بيتحقق من hasPermission(key) - المالك بيعدي
    دايمًا، الموظف بس لو عنده الصلاحية
  - ownerOnly: بيتحقق من isOwner بس (بغض النظر عن أي صلاحية) - للصفحات
    يلي حصرية على المالك تمامًا زي "الملف الشخصي" (بيانات/كلمة مرور
    حساب المالك الشخصية، مش موضوع صلاحيات بالأساس)
*/
const RequirePermission = ({ permissionKey, ownerOnly = false, children }) => {
  const { isOwner, hasPermission, loading } = useAuth();

  // ProtectedRoute بالمستوى الأعلى أصلاً بيعرض شاشة التحميل لحد ما
  // نتأكد من الجلسة - هون بس احتياط إضافي لتفادي "ومضة" محتوى خاطئة
  if (loading) return null;

  const allowed = ownerOnly ? isOwner : hasPermission(permissionKey);

  if (!allowed) {
    return (
      <div className="permission-denied-page">
        <h2 className="permission-denied-title">غير مصرح لك بالوصول</h2>
        <p className="permission-denied-text">
          ما عندك صلاحية الوصول لهذا القسم. تواصل مع صاحب المتجر لو محتاج صلاحية
          إضافية.
        </p>
      </div>
    );
  }

  return children;
};

export default RequirePermission;

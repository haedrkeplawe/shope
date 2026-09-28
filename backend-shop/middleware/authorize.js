const Staff = require("../models/staff");

/*
  middleware/authorize.js
  ------------------------------------------------------------------
  طبقة "التفويض" (Authorization) - منفصلة تمامًا عن verifyStore (طبقة
  "المصادقة" Authentication يلي بتتحقق بس إنه الطلب جاي من حساب مسجل
  دخول فعليًا، مالك أو موظف). هاي الطبقة بتقرر هل هالحساب بالذات مسموح
  له يوصل لهالمورد بالضبط - بتشتغل دايمًا بعد verifyStore مباشرة

  ⚠️ قرار معماري مهم ومقصود: الصلاحيات ما بتُقرأ من التوكن (JWT) -
  بتُقرأ من قاعدة البيانات لحظيًا بكل طلب محمي. لو خزّناها بالتوكن، سحب
  صلاحية من موظف كان رح يضل بلا تأثير فعلي لحد ما التوكن ينتهي (لغاية 7
  أيام حسب مدة صلاحية storeToken الحالية) - فجوة أمان حقيقية. الكلفة:
  استعلام Mongo إضافي خفيف جدًا بكل طلب محمي (بحث بـ _id، مؤشّر أصلاً) -
  مقبولة جدًا مقابل ضمان إن سحب/تعليق صلاحية موظف ينعكس فورًا بالطلب
  التالي مباشرة، بلا أي تأخير

  requireOwner: يسمح فقط لحساب المالك (Store) - بلا أي استثناء، حتى لو
  عندك موظف صلاحياته "الكل مفعّل". يُستخدم للإجراءات الحساسة يلي ما
  لازم تكون قابلة للتفويض إطلاقًا مهما كان: إدارة الموظفين نفسها (شوف
  staff.routes.js)، إيقاف/تفعيل المتجر بالكامل، كلمة مرور وصورة حساب
  المالك الشخصية - حماية أساسية من ترقية الصلاحيات الذاتية
  (Privilege Escalation)

  requirePermission(resourceKey): المالك بيعدي دايمًا بلا أي تحقق إضافي
  (صلاحيات غير مشروطة بالتعريف). الموظف لازم يكون حسابه "نشط" (status)
  + عنده true بمفتاح هالمورد بالضبط ضمن permissions، وإلا 403. مفاتيح
  الموارد المقبولة موثّقة بـ utils/permissions.js (PERMISSION_KEYS)
*/

const requireOwner = (req, res, next) => {
  if (req.storeAuth?.role !== "store") {
    return res
      .status(403)
      .json({ message: "هذا الإجراء متاح فقط لصاحب المتجر" });
  }
  next();
};

const requirePermission = (resourceKey) => async (req, res, next) => {
  // المالك بصلاحيات غير مشروطة - يعدي دايمًا بلا استثناء
  if (req.storeAuth?.role === "store") return next();

  try {
    const staff = await Staff.findById(req.storeAuth?.id);

    if (!staff) {
      return res.status(401).json({ message: "الحساب غير موجود" });
    }

    if (staff.status !== "active") {
      return res
        .status(403)
        .json({ message: "تم إيقاف هذا الحساب، تواصل مع صاحب المتجر" });
    }

    if (!staff.permissions?.[resourceKey]) {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالوصول لهذا القسم" });
    }

    // احتياطي - لو أي كنترولر لاحقًا احتاج بيانات الموظف نفسه بلا استعلام تاني
    req.staffDoc = staff;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

module.exports = { requireOwner, requirePermission };

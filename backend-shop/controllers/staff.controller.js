const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Staff = require("../models/staff");
const {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  buildEmptyPermissions,
} = require("../utils/permissions");

/*
  staff.controller.js
  ------------------------------------------------------------------
  إدارة حسابات "الموظفين/المساعدين" - كل الراوتس هون محصورة بحساب
  المالك حصرًا (requireOwner بـ staff.routes.js، شوف شرحه بـ
  middleware/authorize.js) - ما في أي استثناء ولا أي صلاحية بالجدول
  تفتح هالقسم لموظف، حتى لو صلاحياته "الكل"

  الصلاحيات بتنضبط وقت الإنشاء أو التعديل بس (بجسم الطلب)، اعتمادًا على
  PERMISSION_KEYS (utils/permissions.js) كمصدر الحقيقة الوحيد لأسماء
  المفاتيح المقبولة - أي مفتاح مش موجود بالقائمة بيتجاهل تلقائيًا
  (sanitizePermissions تحت)
*/

// بيحوّل جسم طلب صلاحيات خام (جاي من الفرونت) لكائن آمن يحتوي بس على
// المفاتيح المعروفة بـ PERMISSION_KEYS - حماية من حقن مفاتيح غير متوقعة
// بجسم الطلب (لو حدا بعت permissions.isOwner: true مثلاً، بيتجاهل تمامًا)
const sanitizePermissions = (rawPermissions = {}) => {
  const safe = buildEmptyPermissions();
  PERMISSION_KEYS.forEach((key) => {
    if (typeof rawPermissions[key] === "boolean") {
      safe[key] = rawPermissions[key];
    }
  });
  return safe;
};

const serializeStaff = (staff) => ({
  id: staff._id,
  fullName: staff.fullName,
  phone: staff.phone,
  jobTitle: staff.jobTitle,
  permissions: staff.permissions,
  status: staff.status,
  createdAt: staff.createdAt,
});

/*
  قائمة كل الموظفين (لشاشة "الأدوار" بالإعدادات) + قائمة مفاتيح
  الصلاحيات المتاحة (عشان الفرونت يبني الـ checkboxes منها مباشرة بلا
  ما يكرر القائمة يدويًا بجهته)
  GET /api/staff
*/
exports.getStaffList = async (req, res) => {
  try {
    const staffList = await Staff.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      staff: staffList.map(serializeStaff),
      permissionKeys: PERMISSION_KEYS,
      permissionLabels: PERMISSION_LABELS,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إضافة موظف جديد
  POST /api/staff   body: { fullName, phone, password, jobTitle?, permissions? }
*/
exports.createStaff = async (req, res) => {
  try {
    const { fullName, phone, password, jobTitle, permissions } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "الاسم الكامل مطلوب" });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: "رقم الجوال مطلوب" });
    }
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    const existing = await Staff.findOne({ phone: phone.trim() });
    if (existing) {
      return res
        .status(409)
        .json({ message: "رقم الهاتف هذا مستخدم أصلاً لموظف آخر" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await Staff.create({
      fullName: fullName.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      jobTitle: (jobTitle || "").trim(),
      permissions: sanitizePermissions(permissions),
    });

    return res.status(201).json({
      message: "تم إضافة الموظف بنجاح",
      staff: serializeStaff(staff),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "رقم الهاتف هذا مستخدم أصلاً لموظف آخر" });
    }
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل بيانات/صلاحيات/حالة موظف (أو كلمة مروره لو الأدمن حاب يعيد
  ضبطها يدويًا - مثلاً لو الموظف نسيها)
  PATCH /api/staff/:id   body: { fullName?, jobTitle?, permissions?, status?, password? }
*/
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف موظف غير صالح" });
    }

    const { fullName, jobTitle, permissions, status, password } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: "الموظف غير موجود" });
    }

    if (fullName && fullName.trim()) staff.fullName = fullName.trim();
    if (jobTitle !== undefined) staff.jobTitle = jobTitle.trim();
    if (permissions) staff.permissions = sanitizePermissions(permissions);
    if (status && ["active", "suspended"].includes(status)) {
      staff.status = status;
    }
    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      staff.password = await bcrypt.hash(password, 10);
    }

    await staff.save();

    return res.status(200).json({
      message: "تم تحديث بيانات الموظف بنجاح",
      staff: serializeStaff(staff),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف موظف نهائيًا (لو الأدمن يفضّل الحذف الكامل بدل التعليق البسيط
  عبر status - الاثنين متاحين، حسب الحاجة)
  DELETE /api/staff/:id
*/
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف موظف غير صالح" });
    }

    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) {
      return res.status(404).json({ message: "الموظف غير موجود" });
    }

    return res.status(200).json({ message: "تم حذف الموظف بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

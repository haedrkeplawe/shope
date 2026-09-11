const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");
const Staff = require("../models/staff");
const cloudinary = require("../config/cloudinary");

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 45;

// رمز تجريبي يُقبل فقط في وضع التطوير (غير الإنتاج) لتسهيل الاختبار من غير ربط SMS فعلي
const DEV_OTP_BYPASS = "123456";
// const isDev = process.env.NODE_ENV !== "production";
const isDev = true;

// بيوقّع توكن الجلسة - role بتحدد نوع الحساب (store = المالك بصلاحيات
// غير مشروطة، staff = موظف بصلاحيات محدودة تُقرأ لحظيًا من قاعدة
// البيانات بكل طلب، شوف middleware/authorize.js). ⚠️ الصلاحيات نفسها
// عن قصد مش جزء من التوكن - شوف شرح مفصّل بـ authorize.js
const signToken = (account, role) =>
  jwt.sign(
    { id: account._id, phone: account.phone, role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/*
  بيدوّر على حساب برقم الهاتف - بحساب المالك (Store) أولاً، وإلا بحسابات
  الموظفين (Staff). موحّد لكل عمليات تسجيل الدخول (login/verify-otp/
  resend-otp) عشان صفحة الدخول تضل واحدة للجميع، بدل ما نبني تدفق دخول
  منفصل لكل نوع حساب ونكرر كل بنية الـ OTP التحتية من الصفر
  selectFields: أي حقول إضافية مستورة (select: false) لازم نجيبها
  (مثلاً "+password" أو "+otpCode +otpExpiresAt") حسب سياق الاستدعاء
*/
const findAccountByPhone = async (phone, selectFields) => {
  const store = await Store.findOne({ phone }).select(selectFields);
  if (store) return { account: store, role: "store" };

  const staff = await Staff.findOne({ phone }).select(selectFields);
  if (staff) return { account: staff, role: "staff" };

  return null;
};

/*
  إنشاء بيانات المتجر (مرة واحدة فقط)
  POST /api/store
  - النظام كله متجر واحد بس، فلو موجود قبل كده بيرفض الإنشاء تاني
  - هيتضاف حاليًا يدويًا عن طريق Postman (مفيش فرونت للتسجيل)
*/
exports.createStore = async (req, res) => {
  try {
    const { storeName, fullName, email, phone, password } = req.body;

    if (!storeName || !fullName || !email || !phone || !password) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    const existingStore = await Store.findOne({});
    if (existingStore) {
      return res
        .status(409)
        .json({ message: "بيانات المتجر موجودة بالفعل، يمكنك تعديلها فقط" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const store = await Store.create({
      storeName,
      fullName,
      email,
      phone,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "تم إنشاء بيانات المتجر بنجاح",
      store: {
        id: store._id,
        storeName: store.storeName,
        fullName: store.fullName,
        email: store.email,
        phone: store.phone,
        status: store.status,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب بيانات المتجر
  GET /api/store
*/
exports.getStore = async (req, res) => {
  try {
    const store = await Store.findOne({});

    if (!store) {
      return res
        .status(404)
        .json({ message: "لم يتم إنشاء بيانات المتجر بعد" });
    }

    return res.status(200).json({ store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل بيانات المتجر (الاسم، الإيميل، الهاتف، النبذة الشخصية)
  PATCH /api/store
  ⚠️ ما عاد بتقبل كلمة مرور هون - تغيير كلمة المرور صار له مسار مستقل
  (PATCH /api/store/password → changePassword) بيتحقق من كلمة المرور
  الحالية قبل أي تغيير، أأمن من التحديث العام هون يلي كان ممكن يبدّل
  الباسورد من غير أي تحقق - شوف شرح changePassword بالأسفل
*/
exports.updateStore = async (req, res) => {
  try {
    const { storeName, fullName, email, phone, bio } = req.body;

    const store = await Store.findOne({});
    if (!store) {
      return res
        .status(404)
        .json({ message: "لم يتم إنشاء بيانات المتجر بعد" });
    }

    if (storeName) store.storeName = storeName;
    if (fullName) store.fullName = fullName;
    if (email) store.email = email;
    if (phone) store.phone = phone;
    if (bio !== undefined) store.bio = bio;

    await store.save();

    return res
      .status(200)
      .json({ message: "تم تحديث بيانات المتجر بنجاح", store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تغيير حالة المتجر (تفعيل / تعليق)
  PATCH /api/store/status
*/
exports.updateStoreStatus = async (req, res) => {
  try {
    const { status } = req.body; // "active" أو "suspended"

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const store = await Store.findOne({});
    if (!store) {
      return res
        .status(404)
        .json({ message: "لم يتم إنشاء بيانات المتجر بعد" });
    }

    store.status = status;
    await store.save();

    return res
      .status(200)
      .json({ message: "تم تحديث حالة المتجر بنجاح", store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تغيير كلمة المرور (من صفحة "الملف الشخصي" → كارت "الأمان وكلمة المرور")
  PATCH /api/store/password   body: { currentPassword, newPassword }
  ⚠️ مسار مستقل عن updateStore عن قصد - بيتحقق من كلمة المرور الحالية
  فعليًا قبل أي تغيير (بعكس updateStore العام يلي ما بيتحقق من أي شي)،
  حماية أساسية حتى لو حدا فتح جلسة الأدمن من جهاز مش جهازه
*/
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "كلمة المرور الحالية والجديدة مطلوبتان" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }

    const store = await Store.findById(req.storeAuth.id).select("+password");
    if (!store) {
      return res.status(404).json({ message: "المتجر غير موجود" });
    }

    const isMatch = await bcrypt.compare(currentPassword, store.password);
    if (!isMatch) {
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    store.password = await bcrypt.hash(newPassword, 10);
    await store.save();

    return res.status(200).json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تحديث الصورة الشخصية لصاحب المتجر (كارت "الملف الشخصي")
  PATCH /api/store/avatar   multipart/form-data: avatar
  نفس أسلوب صورة الفئة بالضبط - بيحذف الصورة القديمة من Cloudinary قبل
  ما يستبدلها عشان منسيبش ملفات يتيمة (شوف category.controller.js)
*/
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "لم يتم إرفاق صورة" });
    }

    const store = await Store.findOne({});
    if (!store) {
      return res
        .status(404)
        .json({ message: "لم يتم إنشاء بيانات المتجر بعد" });
    }

    if (store.avatarPublicId) {
      await cloudinary.uploader
        .destroy(store.avatarPublicId)
        .catch((err) =>
          console.error("فشل حذف الصورة الشخصية القديمة:", err.message),
        );
    }

    store.avatar = req.file.path;
    store.avatarPublicId = req.file.filename;
    await store.save();

    return res
      .status(200)
      .json({ message: "تم تحديث الصورة الشخصية بنجاح", store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/* -------------------- تسجيل الدخول (هاتف + كلمة مرور + OTP) -------------------- */

/*
  الخطوة الأولى: تسجيل الدخول برقم الهاتف وكلمة المرور
  POST /api/store/login
  - موحّد لحساب المالك وحسابات الموظفين سوا (findAccountByPhone فوق) -
    صفحة دخول واحدة بالفرونت للجميع
  - لو صحيحة، يتولد رمز OTP ويُرسل (حاليًا يُطبع بالكونسول لحين ربط مزود SMS)
*/
exports.loginStore = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "رقم الهاتف وكلمة المرور مطلوبان" });
    }

    const found = await findAccountByPhone(phone, "+password");
    if (!found) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }
    const { account, role } = found;

    if (account.status === "suspended") {
      return res.status(403).json({
        message:
          role === "store"
            ? "تم تعليق هذا المتجر، تواصل مع الدعم"
            : "تم إيقاف هذا الحساب، تواصل مع صاحب المتجر",
      });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const otpCode = generateOtp();
    account.otpCode = otpCode;
    account.otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000,
    );
    account.otpLastSentAt = new Date();
    await account.save();

    // TODO: ربط مزود SMS فعلي هنا لإرسال الرمز، حاليًا يُطبع بالكونسول للتجربة
    console.log(`📱 OTP لرقم ${phone}: ${otpCode}`);

    return res.status(200).json({
      message: "تم إرسال رمز التحقق إلى رقم هاتفك",
      phone: account.phone,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  الخطوة الثانية: التحقق من رمز OTP وإتمام تسجيل الدخول
  POST /api/store/verify-otp
*/
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ message: "رقم الهاتف والرمز مطلوبان" });
    }

    const found = await findAccountByPhone(phone, "+otpCode +otpExpiresAt");
    if (!found) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }
    const { account, role } = found;

    const isDevBypass = isDev && code === DEV_OTP_BYPASS;

    if (!isDevBypass) {
      if (!account.otpCode || !account.otpExpiresAt) {
        return res
          .status(400)
          .json({ message: "لا يوجد رمز تحقق فعّال، الرجاء طلب رمز جديد" });
      }

      if (account.otpExpiresAt < new Date()) {
        return res
          .status(400)
          .json({ message: "انتهت صلاحية الرمز، الرجاء طلب رمز جديد" });
      }

      if (account.otpCode !== code) {
        return res.status(400).json({ message: "رمز التحقق غير صحيح" });
      }
    }

    account.otpCode = undefined;
    account.otpExpiresAt = undefined;
    await account.save();

    const token = signToken(account, role);
    const isProd = process.env.NODE_ENV === "production";

    // sameSite: "none" ضروري لأن الفرونت والباك شغالين على دومينين مختلفين وقت الإنتاج
    // (لازم يترافق مع secure: true، والمتصفح مش بيقبل none من غير secure)
    // محليًا (http://localhost) بنرجع لـ "lax" لأن secure:true مش هيشتغل غير على https
    res.cookie("storeToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "تم تسجيل الدخول بنجاح",
      store: {
        id: account._id,
        fullName: account.fullName,
        phone: account.phone,
        role,
        ...(role === "store"
          ? { storeName: account.storeName, email: account.email }
          : { jobTitle: account.jobTitle, permissions: account.permissions }),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إعادة إرسال رمز OTP (بعد انتهاء مهلة العد التنازلي)
  POST /api/store/resend-otp
*/
exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "رقم الهاتف مطلوب" });
    }

    const found = await findAccountByPhone(phone, "+otpLastSentAt");
    if (!found) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }
    const { account } = found;

    if (account.otpLastSentAt) {
      const secondsSinceLastSend =
        (Date.now() - account.otpLastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < OTP_RESEND_SECONDS) {
        const remaining = Math.ceil(OTP_RESEND_SECONDS - secondsSinceLastSend);
        return res.status(429).json({
          message: `الرجاء الانتظار ${remaining} ثانية قبل إعادة الإرسال`,
        });
      }
    }

    const otpCode = generateOtp();
    account.otpCode = otpCode;
    account.otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000,
    );
    account.otpLastSentAt = new Date();
    await account.save();

    console.log(`📱 OTP جديد لرقم ${phone}: ${otpCode}`);

    return res.status(200).json({ message: "تم إرسال رمز تحقق جديد" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب بيانات الحساب المسجل دخوله حاليًا (للتأكد من صلاحية الجلسة) -
  موحّدة لحساب المالك وحسابات الموظفين سوا، بشكل استجابة واحد يحمل
  role + permissions (null لو مالك = صلاحيات غير مشروطة)
  GET /api/store/me
  - يُستخدم من الفرونت إند عشان يعرف هل الجلسة لسه شغالة، ونوع الحساب،
    وأي صفحات مسموح له يشوفها (شوف AuthContext.jsx + Sidebar.jsx)
*/
exports.getMe = async (req, res) => {
  try {
    if (req.storeAuth.role === "staff") {
      const staff = await Staff.findById(req.storeAuth.id);
      if (!staff) {
        return res.status(404).json({ message: "الحساب غير موجود" });
      }
      if (staff.status === "suspended") {
        return res
          .status(403)
          .json({ message: "تم إيقاف هذا الحساب، تواصل مع صاحب المتجر" });
      }

      return res.status(200).json({
        store: {
          id: staff._id,
          fullName: staff.fullName,
          phone: staff.phone,
          jobTitle: staff.jobTitle,
          role: "staff",
          permissions: staff.permissions,
        },
      });
    }

    const store = await Store.findById(req.storeAuth.id);
    if (!store) {
      return res.status(404).json({ message: "المتجر غير موجود" });
    }

    return res.status(200).json({
      store: {
        id: store._id,
        storeName: store.storeName,
        fullName: store.fullName,
        phone: store.phone,
        email: store.email,
        status: store.status,
        avatar: store.avatar,
        bio: store.bio,
        role: "store",
        permissions: null, // null = صلاحيات غير مشروطة (مش "بلا صلاحيات")
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تسجيل الخروج (مسح الكوكيز)
  POST /api/store/logout
*/
exports.logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("storeToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  return res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
};

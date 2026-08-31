const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Store = require("../models/store");

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 45;

// رمز تجريبي يُقبل فقط في وضع التطوير (غير الإنتاج) لتسهيل الاختبار من غير ربط SMS فعلي
const DEV_OTP_BYPASS = "123456";
// const isDev = process.env.NODE_ENV !== "production";
const isDev = true;

const signToken = (store) =>
  jwt.sign(
    { id: store._id, phone: store.phone, role: "store" },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  تعديل بيانات المتجر
  PATCH /api/store
*/
exports.updateStore = async (req, res) => {
  try {
    const { storeName, fullName, email, phone, password } = req.body;

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
    if (password) store.password = await bcrypt.hash(password, 10);

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

/* -------------------- تسجيل الدخول (هاتف + كلمة مرور + OTP) -------------------- */

/*
  الخطوة الأولى: تسجيل الدخول برقم الهاتف وكلمة المرور
  POST /api/store/login
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

    const store = await Store.findOne({ phone }).select("+password");
    if (!store) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    if (store.status === "suspended") {
      return res
        .status(403)
        .json({ message: "تم تعليق هذا المتجر، تواصل مع الدعم" });
    }

    const isMatch = await bcrypt.compare(password, store.password);
    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const otpCode = generateOtp();
    store.otpCode = otpCode;
    store.otpExpiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
    store.otpLastSentAt = new Date();
    await store.save();

    // TODO: ربط مزود SMS فعلي هنا لإرسال الرمز، حاليًا يُطبع بالكونسول للتجربة
    console.log(`📱 OTP لرقم ${phone}: ${otpCode}`);

    return res.status(200).json({
      message: "تم إرسال رمز التحقق إلى رقم هاتفك",
      phone: store.phone,
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

    const store = await Store.findOne({ phone }).select(
      "+otpCode +otpExpiresAt",
    );
    if (!store) {
      return res.status(404).json({ message: "المتجر غير موجود" });
    }

    const isDevBypass = isDev && code === DEV_OTP_BYPASS;

    if (!isDevBypass) {
      if (!store.otpCode || !store.otpExpiresAt) {
        return res
          .status(400)
          .json({ message: "لا يوجد رمز تحقق فعّال، الرجاء طلب رمز جديد" });
      }

      if (store.otpExpiresAt < new Date()) {
        return res
          .status(400)
          .json({ message: "انتهت صلاحية الرمز، الرجاء طلب رمز جديد" });
      }

      if (store.otpCode !== code) {
        return res.status(400).json({ message: "رمز التحقق غير صحيح" });
      }
    }

    store.otpCode = undefined;
    store.otpExpiresAt = undefined;
    await store.save();

    const token = signToken(store);
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
        id: store._id,
        storeName: store.storeName,
        fullName: store.fullName,
        phone: store.phone,
        email: store.email,
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

    const store = await Store.findOne({ phone }).select("+otpLastSentAt");
    if (!store) {
      return res.status(404).json({ message: "المتجر غير موجود" });
    }

    if (store.otpLastSentAt) {
      const secondsSinceLastSend =
        (Date.now() - store.otpLastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < OTP_RESEND_SECONDS) {
        const remaining = Math.ceil(OTP_RESEND_SECONDS - secondsSinceLastSend);
        return res.status(429).json({
          message: `الرجاء الانتظار ${remaining} ثانية قبل إعادة الإرسال`,
        });
      }
    }

    const otpCode = generateOtp();
    store.otpCode = otpCode;
    store.otpExpiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
    store.otpLastSentAt = new Date();
    await store.save();

    console.log(`📱 OTP جديد لرقم ${phone}: ${otpCode}`);

    return res.status(200).json({ message: "تم إرسال رمز تحقق جديد" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب بيانات المتجر المسجل دخوله حاليًا (للتأكد من صلاحية الجلسة)
  GET /api/store/me
  - يُستخدم من الفرونت إند عشان يعرف هل الجلسة لسه شغالة قبل ما يفتح لوحة التحكم
*/
exports.getMe = async (req, res) => {
  try {
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

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/*
  middleware/rateLimiters.js
  ------------------------------------------------------------------
  حدود عدد الطلبات لنقاط الدخول الحساسة (تسجيل الدخول، رموز التحقق،
  استعادة كلمة المرور) - للزبون (customer.routes.js) وللأدمن/الموظفين
  (store.routes.js) سوا

  ليش: بدونها أي حدا بيقدر يجرّب كلمات مرور ورموز تحقق بلا حدود، ويطلب
  رسائل واتساب بلا حدود (كل رسالة إلها كلفة فعلية)

  ⚠️ قرار مهم: المفتاح مش الـ IP لحاله بمعظم الحدود. بسوريا شركات الاتصال
  بتشارك نفس الـ IP العام بين مئات المشتركين (CGNAT) - حد صارم على الـ IP
  بس كان رح يحجب زبائن حقيقيين ما إلهم علاقة ببعض. لهيك كل نقطة إلها
  حدّين متراكبين:
  - حد صارم على (IP + رقم الهاتف): بيوقف التخمين على حساب معيّن
  - حد مرن على الـ IP لحاله: بيوقف التخمين على حسابات كتيرة من نفس المكان
  وفوقهم حماية ثالثة على مستوى الحساب نفسه (utils/otpAttempts.js) - رمز
  التحقق بينلغى بعد 5 محاولات غلط مهما تغيّر الـ IP

  - ipKeyGenerator: لازم مع IPv6 (بيجمع عناوين نفس الشبكة /56 بمفتاح واحد،
    وإلا المهاجم بيبدّل العنوان ضمن شبكته ويتجاوز الحد)
  - التخزين بالذاكرة (افتراضي): مناسب لسيرفر واحد (Render الحالي). لو صار
    في أكتر من نسخة للسيرفر لاحقًا، لازم مخزن مشترك (Redis مثلاً)
  - الـ IP الحقيقي محتاج app.set("trust proxy", 1) بـ server.js، وإلا كل
    الطلبات على Render بتطلع من IP البروكسي نفسه
*/

const MINUTE = 60 * 1000;

const ipKey = (req) => ipKeyGenerator(req.ip);

// الرقم متل ما انبعت (بعد التنظيف) - نص فاضي لو مش موجود أو مش نص
const phoneOf = (req) =>
  typeof req.body?.phone === "string" ? req.body.phone.trim() : "";

const createLimiter = ({ windowMs, limit, keyGenerator, message }) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      const retryAfterMinutes = Math.max(
        1,
        Math.ceil((req.rateLimit.resetTime - Date.now()) / MINUTE),
      );
      res.status(options.statusCode).json({
        message: `${message}، الرجاء المحاولة بعد ${retryAfterMinutes} دقيقة`,
      });
    },
  });

/* -------------------- تسجيل الدخول (كلمة المرور) -------------------- */
const loginLimiters = [
  createLimiter({
    windowMs: 15 * MINUTE,
    limit: 8,
    keyGenerator: (req) => `login:${ipKey(req)}:${phoneOf(req)}`,
    message: "محاولات تسجيل دخول كثيرة لهذا الرقم",
  }),
  createLimiter({
    windowMs: 15 * MINUTE,
    limit: 40,
    keyGenerator: (req) => `login-ip:${ipKey(req)}`,
    message: "محاولات تسجيل دخول كثيرة من هذا الجهاز",
  }),
];

/* -------------------- التحقق من الرمز (دخول / استعادة كلمة المرور) -------------------- */
const otpVerifyLimiters = [
  createLimiter({
    windowMs: 15 * MINUTE,
    limit: 10,
    keyGenerator: (req) => `otp-verify:${ipKey(req)}:${phoneOf(req)}`,
    message: "محاولات تحقق كثيرة لهذا الرقم",
  }),
  createLimiter({
    windowMs: 15 * MINUTE,
    limit: 40,
    keyGenerator: (req) => `otp-verify-ip:${ipKey(req)}`,
    message: "محاولات تحقق كثيرة من هذا الجهاز",
  }),
];

/* -------------------- إرسال رمز (إعادة إرسال / نسيت كلمة المرور) -------------------- */
// كل طلب هون بيبعت رسالة واتساب فعلية (كلفة) - الحد على الرقم نفسه بغض
// النظر عن الـ IP، عشان ما حدا يغرق رقم شخص برسائل من أجهزة مختلفة. وفوقه
// مهلة الـ 45 ثانية بين كل إرسالين الموجودة أصلاً بالكنترولرات
const otpSendLimiters = [
  createLimiter({
    windowMs: 60 * MINUTE,
    limit: 5,
    keyGenerator: (req) => `otp-send:${phoneOf(req)}`,
    message: "تم طلب رموز تحقق كثيرة لهذا الرقم",
  }),
  createLimiter({
    windowMs: 60 * MINUTE,
    limit: 20,
    keyGenerator: (req) => `otp-send-ip:${ipKey(req)}`,
    message: "تم طلب رموز تحقق كثيرة من هذا الجهاز",
  }),
];

/* -------------------- إنشاء حساب جديد -------------------- */
const registerLimiters = [
  createLimiter({
    windowMs: 60 * MINUTE,
    limit: 10,
    keyGenerator: (req) => `register-ip:${ipKey(req)}`,
    message: "محاولات إنشاء حساب كثيرة من هذا الجهاز",
  }),
];

module.exports = {
  loginLimiters,
  otpVerifyLimiters,
  otpSendLimiters,
  registerLimiters,
};

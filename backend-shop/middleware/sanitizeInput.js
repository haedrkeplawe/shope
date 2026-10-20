/*
  middleware/sanitizeInput.js
  ------------------------------------------------------------------
  حماية من حقن MongoDB (NoSQL Injection) عبر جسم الطلب (req.body)

  المشكلة: express.json() (وmulter بالحقول المتداخلة متل a[b]) بيقبلوا
  كائنات مش بس نصوص. لو حدا بعت بدل رقم الهاتف:
    { "phone": { "$ne": "" } }
  الاستعلام Store.findOne({ phone }) بيصير "أي رقم مش فاضي" وبيرجّع أول
  حساب بقاعدة البيانات (غالبًا حساب المالك) - بدون ما يعرف ولا رقم

  طبقتين حماية:
  1) sanitizeBody: بيشيل أي مفتاح بيبلّش بـ "$" (معاملات Mongo متل $ne,
     $gt, $where...) أو مفاتيح تلويث النموذج الأولي (__proto__,
     constructor, prototype) - من أي عمق بالكائن. مركّب عالميًا بعد
     express.json() (server.js)، وبعد multer بميدل ويرز الرفع (لأنه multer
     بيشتغل على مستوى الراوت، بعد الميدل ويرز العامة)
  2) requireStringFields: لحقول تسجيل الدخول الحساسة (رقم الهاتف، كلمة
     المرور، الرمز...) - لازم تكون نص حرفيًا وإلا 400 مباشرة. طبقة إضافية
     صريحة فوق الأولى، لأنه بعد التنظيف { "$ne": "" } بيصير {} وهاد كمان
     مش رقم هاتف

  ⚠️ req.query ما بيحتاج تنظيف: Express 5 بيستخدم المحلّل "simple"
  افتراضيًا (querystring تبع Node) يلي ما بيبني كائنات متداخلة أصلاً -
  ?phone[$ne]=x بيوصل كمفتاح نصي حرفي "phone[$ne]" مش كائن
*/

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const stripDangerousKeys = (value) => {
  if (Array.isArray(value)) {
    value.forEach(stripDangerousKeys);
    return value;
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      if (key.startsWith("$") || FORBIDDEN_KEYS.has(key)) {
        delete value[key];
      } else {
        stripDangerousKeys(value[key]);
      }
    });
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") stripDangerousKeys(req.body);
  next();
};

// الحقول الموجودة بالطلب لازم تكون نص - الحقول الغايبة ما منتحقق منها هون
// (كل كنترولر أصلاً بيتحقق من الحقول المطلوبة عنده)
const requireStringFields =
  (...fields) =>
  (req, res, next) => {
    const invalid = fields.some(
      (field) =>
        req.body?.[field] !== undefined && typeof req.body[field] !== "string",
    );
    if (invalid) {
      return res.status(400).json({ message: "بيانات الطلب غير صالحة" });
    }
    next();
  };

// كل الحقول النصية الممكنة بطلبات الدخول/التحقق/استعادة كلمة المرور
const AUTH_STRING_FIELDS = [
  "phone",
  "password",
  "code",
  "otp",
  "newPassword",
  "confirmPassword",
  "fullName",
  "email",
];

module.exports = {
  stripDangerousKeys,
  sanitizeBody,
  requireStringFields,
  requireAuthStrings: requireStringFields(...AUTH_STRING_FIELDS),
};

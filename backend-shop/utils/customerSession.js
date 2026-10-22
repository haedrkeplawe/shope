// user
/*
  utils/customerSession.js
  ------------------------------------------------------------------
  جلسة الزبون (كوكي customerToken) - كل منطقها بمكان واحد: إصدارها،
  مسحها، والتحقق منها مع كل طلب. مستخدم بـ customer.controller.js
  (الدخول/الخروج) وبالميدل ويرين verifyCustomer وattachCustomerIfPresent

  ⚠️ قرار صاحب المشروع: الزبون بعد ما يسجّل دخول ما لازم ينطلب منه يرجع
  يسجّل أبدًا، إلا إذا عمل تسجيل خروج بإيده. "للأبد" بالحرف مش ممكن، لأنه
  المتصفحات (Chrome) ما بتقبل كوكي عمرها أكتر من 400 يوم. فالحل جلسة
  بتتجدد لحالها: عمرها SESSION_DAYS، ومع أي طلب من الزبون بعد ما يمر
  REFRESH_AFTER_MS على إصدار التوكن، منطلّعله توكن جديد بعمر كامل. يعني
  الجلسة ما بتخلص إلا إذا الزبون ما فتح الموقع سنة كاملة

  ⚠️ جلسة طويلة هيك ما بتنفع بدون فحص بالداتابيس مع كل طلب (نفس فلسفة
  requirePermission بالأدمن)، وإلا الحساب المعلّق من الأدمن بيضل شغّال
  للأبد، والجلسة المسروقة ما في شي يوقفها. فمع كل طلب منقرا من الحساب:
  - status: المعلّق بينطرد فورًا (قبل كان التعليق بيمنع الدخول الجديد بس)
  - tokenVersion: رقم نسخة الجلسات. التوكن بيحمل النسخة يلي انطلع فيها
    (tv)، وأي زيادة عالحساب (هلق: استعادة كلمة المرور) بتلغي كل الجلسات
    القديمة على كل الأجهزة دفعة وحدة. التوكنات يلي انطلعت قبل هالحقل ما
    فيها tv، فبتنحسب 0 - عشان ما حدا من الزبائن الحاليين يطلع لما ينزل
    هالتعديل

  تسجيل الخروج العادي بيمسح الكوكي من الجهاز الحالي بس، وما بيلمس
  tokenVersion - عشان ما يطلّع الزبون من أجهزته التانية
*/
const jwt = require("jsonwebtoken");
const Customer = require("../models/customer");

const COOKIE_NAME = "customerToken";
const SESSION_DAYS = 365;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
// التجديد مرة باليوم كحد أقصى، مش مع كل طلب - عشان ما نوقّع توكن جديد
// ونبعت Set-Cookie مع كل طلب منتجات أو سلة
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };
};

const signCustomerToken = (customer) =>
  jwt.sign(
    {
      id: customer._id,
      phone: customer.phone,
      role: "customer",
      tv: customer.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` },
  );

// إصدار جلسة جديدة للحساب (دخول، أو تجديد تلقائي)
const setCustomerSession = (res, customer) => {
  res.cookie(COOKIE_NAME, signCustomerToken(customer), {
    ...cookieOptions(),
    maxAge: SESSION_MS,
  });
};

const clearCustomerSession = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

/*
  التحقق من جلسة الطلب الحالي - بيرجّع واحد من:
  - { status: "none" }: ما في كوكي أصلاً (زائر)
  - { status: "invalid" }: توكن مزوّر أو منتهي، أو نسخته ملغاة، أو مش
    توكن زبون أصلاً، أو الحساب انحذف
  - { status: "suspended" }: الحساب معلّق من الأدمن
  - { status: "ok", auth }: جلسة صالحة، وauth هو محتوى التوكن (req.customerAuth)

  بحالتي invalid وsuspended الكوكي بتنمسح هون مباشرة لأنها ما عاد رح تصلح.
  ⚠️ أما خطأ الداتابيس فبيطلع كاستثناء وما بيمسح شي - عطل مؤقت بالسيرفر
  ما لازم يطلّع الزبون من حسابه
*/
const resolveCustomerSession = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return { status: "none" };

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    clearCustomerSession(res);
    return { status: "invalid" };
  }

  // كوكي الأدمن والزبون موقّعين بنفس السر، فلازم نتأكد إنه توكن زبون فعلاً
  if (decoded.role !== "customer") {
    clearCustomerSession(res);
    return { status: "invalid" };
  }

  const customer = await Customer.findById(decoded.id)
    .select("phone status tokenVersion")
    .lean();

  if (!customer || (decoded.tv || 0) !== (customer.tokenVersion || 0)) {
    clearCustomerSession(res);
    return { status: "invalid" };
  }

  if (customer.status === "suspended") {
    clearCustomerSession(res);
    return { status: "suspended" };
  }

  if (Date.now() - decoded.iat * 1000 > REFRESH_AFTER_MS) {
    setCustomerSession(res, customer);
  }

  return { status: "ok", auth: decoded };
};

module.exports = {
  setCustomerSession,
  clearCustomerSession,
  resolveCustomerSession,
};

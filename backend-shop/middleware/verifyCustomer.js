// user
const { resolveCustomerSession } = require("../utils/customerSession");

/*
  ميدل وير للتأكد إن الطلب جاي من زبون مسجل دخول فعليًا
  بيقرأ التوكن من الكوكيز (customerToken) - منفصلة كليًا عن كوكي الأدمن
  (storeToken) عشان الجلستين ما يتداخلوش أبدًا حتى لو المتصفح نفسه

  ⚠️ التحقق نفسه (التوقيع + فحص الحساب بالداتابيس + التجديد التلقائي)
  كله بـ utils/customerSession.js - شوف الشرح هناك ليش منفحص الداتابيس
  مع كل طلب
*/
const verifyCustomer = async (req, res, next) => {
  let session;
  try {
    session = await resolveCustomerSession(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }

  if (session.status === "none") {
    return res.status(401).json({ message: "غير مصرح، الرجاء تسجيل الدخول" });
  }

  if (session.status === "suspended") {
    return res
      .status(403)
      .json({ message: "تم تعليق هذا الحساب، تواصل مع الدعم" });
  }

  if (session.status !== "ok") {
    return res
      .status(401)
      .json({ message: "انتهت الجلسة، الرجاء تسجيل الدخول من جديد" });
  }

  req.customerAuth = session.auth;
  return next();
};

module.exports = verifyCustomer;

// user
const jwt = require("jsonwebtoken");

/*
  ميدل وير للتأكد إن الطلب جاي من زبون مسجل دخول فعليًا
  بيقرأ التوكن من الكوكيز (customerToken) - منفصلة كليًا عن كوكي الأدمن
  (storeToken) عشان الجلستين ما يتداخلوش أبدًا حتى لو المتصفح نفسه
*/
const verifyCustomer = (req, res, next) => {
  try {
    const token = req.cookies?.customerToken;

    if (!token) {
      return res.status(401).json({ message: "غير مصرح، الرجاء تسجيل الدخول" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.customerAuth = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "انتهت الجلسة، الرجاء تسجيل الدخول من جديد" });
  }
};

module.exports = verifyCustomer;

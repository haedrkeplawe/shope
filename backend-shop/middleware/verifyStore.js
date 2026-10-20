const jwt = require("jsonwebtoken");

/*
  ميدل وير للتأكد إن الطلب جاي من متجر مسجل دخول فعليًا
  بيقرأ التوكن من الكوكيز (storeToken) اللي بيتحط وقت التحقق من OTP
*/
const verifyStore = (req, res, next) => {
  try {
    const token = req.cookies?.storeToken;

    if (!token) {
      return res.status(401).json({ message: "غير مصرح، الرجاء تسجيل الدخول" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.storeAuth = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "انتهت الجلسة، الرجاء تسجيل الدخول من جديد" });
  }
};

module.exports = verifyStore;

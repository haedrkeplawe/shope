// user
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/customer");
const Product = require("../models/product");
const { attachEffectivePrice } = require("../utils/applyOffers");
const { buildLabelMaps } = require("../utils/resolveFilterLabels");
const { serializeShopProduct } = require("../utils/serializeShopProduct");
const { buildCartResult } = require("../utils/serializeCart");

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 45;

// رمز تجريبي يُقبل فقط في وضع التطوير - نفس آلية الأدمن بالضبط، لحد ما
// يترّبط مزود SMS فعلي
const DEV_OTP_BYPASS = "123456";
const isDev = true;

const signToken = (customer) =>
  jwt.sign(
    { id: customer._id, phone: customer.phone, role: "customer" },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
  );

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };
};

const serializeCustomer = (customer) => ({
  id: customer._id,
  fullName: customer.fullName,
  email: customer.email,
  phone: customer.phone,
  status: customer.status,
});

/*
  إنشاء حساب زبون جديد
  POST /api/customers/register
  - بيسجّل الحساب بس - ما بيسجّل دخول تلقائيًا، لازم يمر بخطوة تسجيل
    الدخول (هاتف + كلمة مرور) بعدها زي أي زبون تاني، بنفس تدفق الأدمن تمامًا
*/
exports.registerCustomer = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !phone || !password) {
      return res
        .status(400)
        .json({ message: "الاسم الكامل ورقم الهاتف وكلمة المرور مطلوبين" });
    }

    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res
        .status(409)
        .json({ message: "رقم الهاتف مستخدم بالفعل بحساب آخر" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      fullName,
      email: email || "",
      phone,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "تم إنشاء الحساب بنجاح، الرجاء تسجيل الدخول",
      customer: serializeCustomer(customer),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/* -------------------- تسجيل الدخول (هاتف + كلمة مرور + OTP) -------------------- */

/*
  الخطوة الأولى: تسجيل الدخول برقم الهاتف وكلمة المرور
  POST /api/customers/login
*/
exports.loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "رقم الهاتف وكلمة المرور مطلوبان" });
    }

    const customer = await Customer.findOne({ phone }).select("+password");
    if (!customer) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    if (customer.status === "suspended") {
      return res
        .status(403)
        .json({ message: "تم تعليق هذا الحساب، تواصل مع الدعم" });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const otpCode = generateOtp();
    customer.otpCode = otpCode;
    customer.otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000,
    );
    customer.otpLastSentAt = new Date();
    await customer.save();

    // TODO: ربط مزود SMS فعلي هنا، حاليًا يُطبع بالكونسول للتجربة
    console.log(`📱 OTP لرقم ${phone}: ${otpCode}`);

    return res.status(200).json({
      message: "تم إرسال رمز التحقق إلى رقم هاتفك",
      phone: customer.phone,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  الخطوة الثانية: التحقق من رمز OTP وإتمام تسجيل الدخول
  POST /api/customers/verify-otp
*/
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ message: "رقم الهاتف والرمز مطلوبان" });
    }

    const customer = await Customer.findOne({ phone }).select(
      "+otpCode +otpExpiresAt",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const isDevBypass = isDev && code === DEV_OTP_BYPASS;

    if (!isDevBypass) {
      if (!customer.otpCode || !customer.otpExpiresAt) {
        return res
          .status(400)
          .json({ message: "لا يوجد رمز تحقق فعّال، الرجاء طلب رمز جديد" });
      }

      if (customer.otpExpiresAt < new Date()) {
        return res
          .status(400)
          .json({ message: "انتهت صلاحية الرمز، الرجاء طلب رمز جديد" });
      }

      if (customer.otpCode !== code) {
        return res.status(400).json({ message: "رمز التحقق غير صحيح" });
      }
    }

    customer.otpCode = undefined;
    customer.otpExpiresAt = undefined;
    await customer.save();

    const token = signToken(customer);
    res.cookie("customerToken", token, {
      ...cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "تم تسجيل الدخول بنجاح",
      customer: serializeCustomer(customer),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إعادة إرسال رمز OTP
  POST /api/customers/resend-otp
*/
exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "رقم الهاتف مطلوب" });
    }

    const customer = await Customer.findOne({ phone }).select("+otpLastSentAt");
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    if (customer.otpLastSentAt) {
      const secondsSinceLastSend =
        (Date.now() - customer.otpLastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < OTP_RESEND_SECONDS) {
        const remaining = Math.ceil(OTP_RESEND_SECONDS - secondsSinceLastSend);
        return res.status(429).json({
          message: `الرجاء الانتظار ${remaining} ثانية قبل إعادة الإرسال`,
        });
      }
    }

    const otpCode = generateOtp();
    customer.otpCode = otpCode;
    customer.otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000,
    );
    customer.otpLastSentAt = new Date();
    await customer.save();

    console.log(`📱 OTP جديد لرقم ${phone}: ${otpCode}`);

    return res.status(200).json({ message: "تم إرسال رمز تحقق جديد" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب بيانات الزبون المسجل دخوله حاليًا (للتأكد من صلاحية الجلسة)
  GET /api/customers/me
*/
exports.getMe = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id);

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    return res.status(200).json({ customer: serializeCustomer(customer) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تسجيل الخروج
  POST /api/customers/logout
*/
exports.logout = async (req, res) => {
  res.clearCookie("customerToken", cookieOptions());
  return res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
};

/* -------------------- المفضلة (Wishlist) -------------------- */

/*
  جلب IDs منتجات المفضلة بس (بدون تفاصيل) - خفيفة وسريعة، بتنجلب مرة
  وحدة وقت تسجيل الدخول/فتح الموقع عشان:
  1) نلوّن قلب المنتج بأي كارد بالموقع لو أصلاً بالمفضلة
  2) نعرض عداد المفضلة بأيقونة الهيدر (عدد العناصر بالمصفوفة)
  GET /api/customers/favorites/ids
*/
exports.getFavoriteIds = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id).select(
      "favorites",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    return res.status(200).json({
      ids: customer.favorites.map((id) => id.toString()),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب منتجات المفضلة كاملة (لصفحة "المفضلة" نفسها) - بنفس شكل بيانات
  /api/shop/new-arrivals بالضبط، عشان تترسم بنفس كرت المنتج المستخدم
  بباقي الموقع من غير أي فرق
  GET /api/customers/favorites
*/
exports.getFavorites = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id).populate(
      "favorites",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    // فلترة أي منتج اتحذف نهائيًا من الأدمن بعد ما اتضاف للمفضلة - populate
    // بيرجع null مكانه، فبنستبعده عشان الصفحة ما تنكسر
    const products = customer.favorites.filter(Boolean);

    const withPricing = await attachEffectivePrice(products);
    const labelMaps = await buildLabelMaps(["condition", "brand"]);

    const serialized = withPricing.map((p) =>
      serializeShopProduct(p, labelMaps),
    );

    return res.status(200).json({ products: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إضافة منتج للمفضلة - $addToSet بيتجنب التكرار تلقائيًا لو المنتج أصلاً مضاف
  POST /api/customers/favorites/:productId
*/
exports.addFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $addToSet: { favorites: productId } },
      { new: true },
    ).select("favorites");

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    return res.status(200).json({
      message: "تمت الإضافة للمفضلة",
      count: customer.favorites.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف منتج من المفضلة
  DELETE /api/customers/favorites/:productId
*/
exports.removeFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $pull: { favorites: productId } },
      { new: true },
    ).select("favorites");

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    return res.status(200).json({
      message: "تمت الإزالة من المفضلة",
      count: customer.favorites.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/* -------------------- سلة المشتريات (Cart) -------------------- */

/*
  جلب السلة كاملة - كل سطر بسعره الفعلي المحسوب لحظيًا (بعد أي عروض/خصومات)
  + حالة توفره الحقيقية + مجاميع كاملة (subtotal, shipping, savings, total)
  لو صار أي تعديل تلقائي (كمية اتنقصت، منتج اتحذف نهائيًا) بنحفظه فورًا
  بالداتابيز عشان يضل متزامن بالمرة الجاية
  GET /api/customers/cart
*/
exports.getCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const result = await buildCartResult(customer.cart);

    if (result.needsPersist) {
      customer.cart = result.persistCart;
      await customer.save();
    }

    return res.status(200).json({
      items: result.items,
      totals: result.totals,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  عدد قطع السلة الإجمالي بس (خفيفة وسريعة) - لعداد أيقونة السلة بالهيدر،
  بنفس فلسفة favorites/ids بالضبط (بدون التحقق من توفر كل منتج - أداء
  أسرع، والتحقق الكامل بيصير وقت فتح صفحة السلة نفسها)
  GET /api/customers/cart/count
*/
exports.getCartCount = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const count = customer.cart.reduce((sum, item) => sum + item.quantity, 0);
    return res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إضافة منتج للسلة (أو زيادة كميته لو أصلاً موجود) - بالكمية المطلوبة من
  الزبون، بس محدودة دائمًا بالمخزون الفعلي المتوفر وقت الإضافة
  POST /api/customers/cart/:productId   body: { size, quantity }
*/
exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size = null, quantity = 1 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);

    const product = await Product.findOne({
      _id: productId,
      publishStatus: "published",
    }).select("quantity");

    if (!product) {
      return res.status(404).json({ message: "هاي القطعة غير متاحة حاليًا" });
    }
    if (product.quantity === 0) {
      return res.status(400).json({ message: "نفذت الكمية من هاي القطعة" });
    }

    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const existingLine = customer.cart.find(
      (item) => item.productId.toString() === productId,
    );
    const currentQty = existingLine ? existingLine.quantity : 0;
    const wasClamped = currentQty + requestedQty > product.quantity;
    const newQty = Math.min(product.quantity, currentQty + requestedQty);

    if (existingLine) {
      existingLine.quantity = newQty;
      if (size) existingLine.size = size; // آخر مقاس اختاره الزبون
    } else {
      customer.cart.push({ productId, size, quantity: newQty });
    }

    await customer.save();

    return res.status(200).json({
      message: wasClamped
        ? `تمت الإضافة - الكمية المتوفرة فعليًا ${product.quantity} بس`
        : "تمت الإضافة للسلة",
      count: customer.cart.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل كمية سطر موجود بالسلة مباشرة (من خطوات +/- بصفحة السلة نفسها) -
  محدودة دائمًا بالمخزون الفعلي المتوفر وقت التعديل
  PATCH /api/customers/cart/:productId   body: { quantity }
*/
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "الكمية غير صالحة" });
    }

    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const line = customer.cart.find(
      (item) => item.productId.toString() === productId,
    );
    if (!line) {
      return res.status(404).json({ message: "المنتج مش موجود بالسلة" });
    }

    const product = await Product.findById(productId).select("quantity");
    const cappedQty = product ? Math.min(quantity, product.quantity) : quantity;

    line.quantity = Math.max(1, cappedQty);
    await customer.save();

    return res.status(200).json({
      message: "تم تحديث الكمية",
      quantity: line.quantity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف سطر من السلة
  DELETE /api/customers/cart/:productId
*/
exports.removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $pull: { cart: { productId } } },
      { new: true },
    ).select("cart");

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    return res.status(200).json({
      message: "تمت إزالة القطعة من السلة",
      count: customer.cart.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تفريغ السلة بالكامل
  DELETE /api/customers/cart
*/
exports.clearCart = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $set: { cart: [] } },
      { new: true },
    ).select("cart");

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    return res.status(200).json({ message: "تم تفريغ السلة" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

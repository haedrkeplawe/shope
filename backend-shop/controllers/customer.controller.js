// user
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/customer");
const Product = require("../models/product");
const Order = require("../models/order");
const { attachEffectivePrice } = require("../utils/applyOffers");
const { evaluateCoupon } = require("../utils/couponEngine");
const { buildLabelMaps } = require("../utils/resolveFilterLabels");
const { serializeShopProduct } = require("../utils/serializeShopProduct");
const { buildCartResult } = require("../utils/serializeCart");
const { STATUS_LABELS } = require("../utils/serializeOrder");

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS) || 45;

// رمز تجريبي يُقبل فقط في وضع التطوير - نفس آلية الأدمن بالضبط، لحد ما
// يترّبط مزود SMS فعلي
const DEV_OTP_BYPASS = "123456";
const isDev = true;

// نفس أسماء الشهور المستخدمة بـ report.controller.js / adminMarketer.controller.js
// بالضبط - مكرّرة هون عن قصد (نفس مبدأ عدم وجود ملف ثوابت مشترك حاليًا
// بالنظام لهيك النوع من البيانات الوصفية البسيطة)
const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

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
  // ⚠️ isMarketer هو المفتاح الوحيد يلي على أساسه الفرونت بيقرر يعرض
  // قسم "لوحة المسوّق" بصفحة "حسابي" أو لأ - زبون عادي بيرجع له false
  // دايمًا (شوف شرح موديل Customer الكامل لتفاصيل هالحقل)
  isMarketer: Boolean(customer.marketer?.isMarketer),
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

/* -------------------- التسويق بالعمولة (لوحة المسوّق) -------------------- */

/*
  ملف المسوّق الخاص بالزبون المسجّل دخوله حاليًا - بنفس شكل GET
  /api/admin/marketers/:id بالضبط (adminMarketer.controller.js)، بس
  مقتصر على نفسه فقط (req.customerAuth.id) - زبون عادي (isMarketer
  false) بيرجّعله 403 مباشرة، حتى لو جرّب يوصل الرابط مباشرة بدون ما
  يشوف عنصر القائمة أصلاً بواجهة "حسابي"
  GET /api/customers/marketer/me
*/
exports.getMyMarketerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id).select(
      "fullName email phone marketer",
    );

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }
    if (!customer.marketer?.isMarketer) {
      return res
        .status(403)
        .json({ message: "هذا الحساب غير مسجَّل كمسوّق بالعمولة" });
    }

    const [deliveredOrders, recentOrders] = await Promise.all([
      Order.find({ marketerId: customer._id, status: "delivered" }).select(
        "commissionAmount createdAt",
      ),
      Order.find({ marketerId: customer._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("orderNumber status grandTotal commissionAmount createdAt"),
    ]);

    const totalSales = deliveredOrders.length;
    const totalCommission = deliveredOrders.reduce(
      (sum, o) => sum + (o.commissionAmount || 0),
      0,
    );

    // -------------------- رسم المبيعات الشهرية (آخر 6 شهور) --------------------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const monthBuckets = [];
    for (let i = 0; i < 6; i += 1) {
      const bucketDate = new Date(sixMonthsAgo);
      bucketDate.setMonth(sixMonthsAgo.getMonth() + i);
      monthBuckets.push({
        key: `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`,
        label: AR_MONTHS[bucketDate.getMonth()],
        value: 0,
      });
    }
    const bucketByKey = {};
    monthBuckets.forEach((b) => (bucketByKey[b.key] = b));

    deliveredOrders
      .filter((o) => o.createdAt >= sixMonthsAgo)
      .forEach((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (bucketByKey[key]) bucketByKey[key].value += 1;
      });

    const monthlySales = monthBuckets.map(({ label, value }) => ({
      label,
      value,
    }));

    return res.status(200).json({
      marketer: {
        fullName: customer.fullName,
        email: customer.email || "",
        phone: customer.phone,
        code: customer.marketer.code,
        commissionPercentage: customer.marketer.commissionPercentage,
        status: customer.marketer.status,
        assignedAt: customer.marketer.assignedAt,
        totalSales,
        totalCommission,
      },
      monthlySales,
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: STATUS_LABELS[o.status] || o.status,
        grandTotal: o.grandTotal,
        commissionAmount: o.commissionAmount || 0,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
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
  + حالة توفره الحقيقية + مجاميع كاملة (subtotal, shipping, savings,
  الكوبون المطبّق إن وجد, total). لو صار أي تعديل تلقائي (كمية اتنقصت،
  منتج اتحذف نهائيًا، أو الكوبون المطبّق ما عاد صالح) بنحفظه فورًا
  بالداتابيز عشان يضل متزامن بالمرة الجاية
  GET /api/customers/cart
*/
exports.getCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart appliedCoupon",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const result = await buildCartResult(customer.cart, {
      customerId: req.customerAuth.id,
      appliedCouponCode: customer.appliedCoupon,
    });

    let shouldSave = false;
    if (result.needsPersist) {
      customer.cart = result.persistCart;
      shouldSave = true;
    }
    if (result.clearCoupon && customer.appliedCoupon) {
      customer.appliedCoupon = null;
      shouldSave = true;
    }
    if (shouldSave) {
      await customer.save();
    }

    return res.status(200).json({
      items: result.items,
      totals: result.totals,
      couponRemovedMessage: result.clearCoupon ? result.couponMessage : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تطبيق كوبون على السلة الحالية - بيتحقق من كل شروط الكوبون (صلاحية،
  حالة، حد أدنى للمجموع، أهلية الزبون، حد الاستخدام) عبر المحرك المشترك
  utils/couponEngine.js، ولو صالح بيخزن الكود بس (مش أي تفاصيل تانية)
  على حساب الزبون - يعاد التحقق منه بالكامل من جديد كل قراءة تالية للسلة
  POST /api/customers/cart/coupon   body: { code }
*/
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    console.log(code);

    if (!code || !code.trim()) {
      return res.status(400).json({ message: "أدخل كود الكوبون" });
    }

    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart appliedCoupon",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    // بنحسب الـ subtotal الحالي (من غير أي كوبون) عشان نتحقق الكوبون
    // الجديد على أساسه بشكل صحيح
    const baseResult = await buildCartResult(customer.cart);
    if (baseResult.totals.subtotal === 0) {
      return res.status(400).json({ message: "سلتك فاضية" });
    }

    const evaluation = await evaluateCoupon({
      code,
      customerId: req.customerAuth.id,
      subtotal: baseResult.totals.subtotal,
    });

    if (!evaluation.valid) {
      return res.status(400).json({ message: evaluation.message });
    }

    customer.appliedCoupon = evaluation.coupon.code;
    await customer.save();

    const finalResult = await buildCartResult(customer.cart, {
      customerId: req.customerAuth.id,
      appliedCouponCode: customer.appliedCoupon,
    });

    return res.status(200).json({
      message: "تم تطبيق الكوبون بنجاح",
      items: finalResult.items,
      totals: finalResult.totals,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إلغاء الكوبون المطبّق حاليًا على السلة
  DELETE /api/customers/cart/coupon
*/
exports.removeCoupon = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $set: { appliedCoupon: null } },
      { new: true },
    ).select("cart");

    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const result = await buildCartResult(customer.cart);

    return res.status(200).json({
      message: "تم إلغاء الكوبون",
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
  بيقارن مقاس/لون سطرين مع بعض بشكل موحّد بكل مكان بالكنترولر - null و""
  بيتعاملو كنفس الشي (مفيش مقاس/لون مختار) عشان ما نصير نفرّق بين سطرين
  لازم يكونو نفس الشي بس لاختلاف شكلي بالقيمة الفاضية
*/
const sameVariant = (a, b) =>
  (a.size || null) === (b.size || null) &&
  (a.color || null) === (b.color || null);

/*
  إضافة منتج للسلة - بمقاس ولون محددين (لو المنتج بيدعمهم)

  ⚠️ كل تركيبة (منتج + مقاس + لون) لها سطر مستقل بالسلة - لو الزبون ضاف
  نفس المنتج بمقاس/لون مختلف عن سطر موجود أصلاً، بينضاف سطر جديد كليًا
  (مش بيندمج مع الموجود ولا بيبدّل مقاسه/لونه). الاندماج (زيادة الكمية
  بس) بيصير فقط لو المنتج والمقاس واللون متطابقين تمامًا مع سطر موجود

  المخزون (Product.quantity) مشترك بين كل أسطر نفس المنتج (بمختلف
  المقاس/اللون) - فمجموع كمياتهم مع بعض محدود دائمًا بالمخزون الفعلي
  المتوفر، مش كل سطر لحاله بحد المخزون الكامل
  POST /api/customers/cart/:productId   body: { size, color, quantity }
*/
exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size = null, color = null, quantity = 1 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);
    const normalizedSize = size || null;
    const normalizedColor = color || null;

    const product = await Product.findOne({
      _id: productId,
      publishStatus: "published",
    }).select("quantity colors sizes");

    if (!product) {
      return res.status(404).json({ message: "هاي القطعة غير متاحة حاليًا" });
    }
    if (product.quantity === 0) {
      return res.status(400).json({ message: "نفذت الكمية من هاي القطعة" });
    }
    // تحقق دفاعي: لو المنتج بيدعم ألوان/مقاسات فعليًا، لازم الزبون يكون
    // اختار قيمة - نفس التحقق موجود بالفرونت بس بنعيده هون بشكل نهائي
    if (product.colors?.length > 0 && !normalizedColor) {
      return res.status(400).json({ message: "الرجاء اختيار اللون" });
    }
    if (product.sizes?.length > 0 && !normalizedSize) {
      return res.status(400).json({ message: "الرجاء اختيار المقاس" });
    }

    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const requestedVariant = { size: normalizedSize, color: normalizedColor };
    const existingLine = customer.cart.find(
      (item) =>
        item.productId.toString() === productId &&
        sameVariant(item, requestedVariant),
    );

    // مجموع الكمية المحجوزة أصلًا بأسطر تانية لنفس المنتج (بمقاس/لون
    // مختلف) - المساحة الفعلية المتبقية بالمخزون المشترك لهاد السطر بالذات
    // هي المخزون الكلي ناقص هاد المجموع
    const otherLinesQty = customer.cart
      .filter(
        (item) =>
          item.productId.toString() === productId &&
          (!existingLine ||
            item._id.toString() !== existingLine._id.toString()),
      )
      .reduce((sum, item) => sum + item.quantity, 0);

    const availableForThisLine = Math.max(0, product.quantity - otherLinesQty);
    const currentQty = existingLine ? existingLine.quantity : 0;
    const wasClamped = currentQty + requestedQty > availableForThisLine;
    const newQty = Math.min(availableForThisLine, currentQty + requestedQty);

    if (newQty === 0) {
      return res.status(400).json({
        message: "نفذت الكمية المتوفرة من هاي القطعة بباقي المقاسات/الألوان",
      });
    }

    if (existingLine) {
      existingLine.quantity = newQty;
    } else {
      customer.cart.push({
        productId,
        size: normalizedSize,
        color: normalizedColor,
        quantity: newQty,
      });
    }

    await customer.save();

    return res.status(200).json({
      message: wasClamped
        ? `تمت الإضافة - الكمية المتوفرة فعليًا ${availableForThisLine} بس`
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
  محدودة دائمًا بالمخزون الفعلي المتوفر وقت التعديل، مع مراعاة إنه ممكن
  يكون فيه أسطر تانية تشارك نفس المنتج (بمقاس/لون مختلف) بتاخد من نفس
  المخزون المشترك
  PATCH /api/customers/cart/item/:itemId   body: { quantity }
*/
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "معرّف سطر غير صالح" });
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

    const line = customer.cart.id(itemId);
    if (!line) {
      return res.status(404).json({ message: "المنتج مش موجود بالسلة" });
    }

    const product = await Product.findById(line.productId).select("quantity");

    const otherLinesQty = customer.cart
      .filter(
        (item) =>
          item.productId.toString() === line.productId.toString() &&
          item._id.toString() !== itemId,
      )
      .reduce((sum, item) => sum + item.quantity, 0);

    const availableForThisLine = product
      ? Math.max(0, product.quantity - otherLinesQty)
      : quantity;

    line.quantity = Math.max(1, Math.min(quantity, availableForThisLine || 1));
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
  حذف سطر من السلة - بالـ itemId الخاص بالسطر نفسه (مش productId، لنفس
  سبب updateCartItem أعلاه)
  DELETE /api/customers/cart/item/:itemId
*/
exports.removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "معرّف سطر غير صالح" });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $pull: { cart: { _id: itemId } } },
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
  تفريغ السلة بالكامل - بيمسح الكوبون المطبّق كمان (مفيش معنى يضل مطبّق
  على سلة فاضية)
  DELETE /api/customers/cart
*/
exports.clearCart = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.customerAuth.id,
      { $set: { cart: [], appliedCoupon: null } },
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

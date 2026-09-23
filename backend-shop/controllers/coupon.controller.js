const Coupon = require("../models/coupon");
const Customer = require("../models/customer");
const CartRecoveryLog = require("../models/cartRecoveryLog");
const { notifyCustomers } = require("../utils/notificationEngine");
const { buildCartResult } = require("../utils/serializeCart");

/*
  coupon.controller.js (لوحة تحكم الأدمن)
  ------------------------------------------------------------------
  إدارة الكوبونات - نفس بنية offer.controller.js بالضبط (حالة محسوبة
  لحظيًا، وصف نطاق نصي، تحقق من الحقول حسب النوع المختار) عشان تضل
  تجربة الأدمن موحّدة بين "العروض" و"الكوبونات"

  ⚠️ إضافة: لما الكوبون scopeType: "specific_customers" وطلب الأدمن
  notifyCustomers=true بالـ body، بنرسل إشعار فوري لكل زبون مشمول
  (utils/notificationEngine.js). لو كمان logCartRecovery=true (جاي من
  تدفق "السلات المتروكة" تحديدًا)، بنسجّل سطر CartRecoveryLog لكل زبون
  عنده سلة غير فاضية حاليًا، عشان نقدر نحسب لاحقًا هل هذا الكوبون فعليًا
  أدى لاسترداد الطلب - شوف models/cartRecoveryLog.js
*/

/*
  بيحسب حالة الكوبون المعروضة لحظيًا - مش مخزّنة بالداتابيز:
  متوقف (يدوي) > منتهي (تاريخ) > مستنفد (وصل الحد الأقصى للاستخدام) >
  مجدول (لسه ما بدأ) > نشط
*/
const computeStatus = (coupon) => {
  if (!coupon.isActive) return "paused";
  const now = new Date();
  if (now > coupon.endDate) return "expired";
  if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage)
    return "exhausted";
  if (now < coupon.startDate) return "scheduled";
  return "active";
};

const describeScope = (coupon) => {
  if (coupon.scopeType === "specific_customers") {
    const count = coupon.customerIds?.length || 0;
    return count === 1 ? "زبون واحد محدد" : `${count} زبائن محددين`;
  }
  return "جميع الزبائن";
};

const serializeCoupon = (coupon) => ({
  id: coupon._id,
  code: coupon.code,
  type: coupon.type,
  discountValue: coupon.discountValue,
  maxDiscountAmount: coupon.maxDiscountAmount,
  minOrderAmount: coupon.minOrderAmount,
  maxUsage: coupon.maxUsage,
  usageCount: coupon.usageCount,
  maxUsagePerCustomer: coupon.maxUsagePerCustomer,
  startDate: coupon.startDate,
  endDate: coupon.endDate,
  isActive: coupon.isActive,
  status: computeStatus(coupon),
  scopeType: coupon.scopeType,
  scopeLabel: describeScope(coupon),
  customers: (coupon.customerIds || [])
    .filter((c) => c && c._id)
    .map((c) => ({ id: c._id, fullName: c.fullName, phone: c.phone })),
  createdAt: coupon.createdAt,
});

/*
  التحقق من صحة الحقول الأساسية - مشترك بين الإنشاء والتعديل
*/
const validateCouponFields = async (body, { isEdit = false } = {}) => {
  const {
    code,
    type,
    discountValue,
    startDate,
    endDate,
    scopeType,
    customerIds,
  } = body;

  if (!isEdit && !code?.trim()) return "كود الكوبون مطلوب";

  if (type && !["percentage", "fixed_amount"].includes(type)) {
    return "نوع الكوبون غير صالح";
  }

  if (discountValue !== undefined) {
    if (!discountValue || Number(discountValue) < 1) {
      return "قيمة الخصم غير صالحة";
    }
    if (
      (type === "percentage" || (!type && !isEdit)) &&
      Number(discountValue) > 100
    ) {
      return "نسبة الخصم لازم تكون بين 1 و100";
    }
  }

  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    return "تاريخ الانتهاء لازم يكون بعد تاريخ البداية";
  }

  if (scopeType && !["all", "specific_customers"].includes(scopeType)) {
    return "نطاق تطبيق الكوبون غير صالح";
  }

  if (
    scopeType === "specific_customers" &&
    (!Array.isArray(customerIds) || customerIds.length === 0)
  ) {
    return "لازم تحدد زبون واحد على الأقل لهذا النطاق";
  }

  return null;
};

/*
  إرسال إشعار "وصول كوبون" لكل زبون مشمول، مع تسجيل اختياري بسجل
  استرداد السلات المتروكة (لو الإجراء جاي من ذاك التدفق تحديدًا)
*/
const notifyCouponCustomers = async (
  coupon,
  customerIds,
  { logCartRecovery = false } = {},
) => {
  await notifyCustomers(customerIds, {
    type: "coupon",
    title: "🎁 وصلك كوبون خصم!",
    message:
      coupon.type === "percentage"
        ? `كود الخصم "${coupon.code}" جاهز الآن - خصم ${coupon.discountValue}% على طلبك القادم`
        : `كود الخصم "${coupon.code}" جاهز الآن - خصم ${coupon.discountValue.toLocaleString(
            "en-US",
          )} ل.س على طلبك القادم`,
    link: "/cart",
    relatedId: coupon._id,
  });

  if (!logCartRecovery) return;

  for (const custId of customerIds) {
    const cust = await Customer.findById(custId).select("cart appliedCoupon");
    if (!cust || !cust.cart?.length) continue;

    const cartResult = await buildCartResult(cust.cart, {
      customerId: cust._id,
      appliedCouponCode: cust.appliedCoupon,
    });
    if (cartResult.totals.subtotal <= 0) continue;

    await CartRecoveryLog.create({
      customerId: custId,
      actionType: "coupon",
      cartValueAtSend: cartResult.totals.subtotal,
      cartItemsCountAtSend: cartResult.totals.totalQuantity,
      couponCode: coupon.code,
    });
  }
};

/*
  جلب كل الكوبونات + إحصائيات الصفحة دفعة وحدة
  GET /api/coupons
*/
exports.getOverview = async (req, res) => {
  try {
    const coupons = await Coupon.find({})
      .populate("customerIds", "fullName phone")
      .sort({ createdAt: -1 });

    const serialized = coupons.map(serializeCoupon);

    const stats = {
      totalCoupons: serialized.length,
      activeCoupons: serialized.filter((c) => c.status === "active").length,
      totalRedemptions: serialized.reduce(
        (sum, c) => sum + (c.usageCount || 0),
        0,
      ),
      scheduledCoupons: serialized.filter((c) => c.status === "scheduled")
        .length,
    };

    return res.status(200).json({ stats, coupons: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب كوبون واحد بالتفصيل (لملء فورم التعديل)
  GET /api/coupons/:id
*/
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate(
      "customerIds",
      "fullName phone",
    );
    if (!coupon) {
      return res.status(404).json({ message: "الكوبون غير موجود" });
    }
    return res.status(200).json({ coupon: serializeCoupon(coupon) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إنشاء كوبون جديد
  POST /api/coupons
  body إضافي (اختياري): notifyCustomers, logCartRecovery - شوف الشرح فوق
*/
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      maxUsage,
      maxUsagePerCustomer,
      startDate,
      endDate,
      scopeType,
      customerIds,
      notifyCustomers: shouldNotify,
      logCartRecovery,
    } = req.body;

    if (!code?.trim() || !type || !discountValue || !startDate || !endDate) {
      return res.status(400).json({ message: "كل الحقول الأساسية مطلوبة" });
    }

    const fieldError = await validateCouponFields(req.body);
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(409).json({ message: "هذا الكود مستخدم بالفعل" });
    }

    const finalScope = scopeType || "all";

    const coupon = await Coupon.create({
      code: normalizedCode,
      type,
      discountValue: Number(discountValue),
      maxDiscountAmount:
        type === "percentage" && maxDiscountAmount
          ? Number(maxDiscountAmount)
          : null,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxUsage: maxUsage ? Number(maxUsage) : null,
      maxUsagePerCustomer: maxUsagePerCustomer
        ? Number(maxUsagePerCustomer)
        : 1,
      startDate,
      endDate,
      scopeType: finalScope,
      customerIds: finalScope === "specific_customers" ? customerIds : [],
    });

    const populated = await coupon.populate("customerIds", "fullName phone");

    if (
      finalScope === "specific_customers" &&
      shouldNotify &&
      customerIds?.length
    ) {
      await notifyCouponCustomers(coupon, customerIds, {
        logCartRecovery: Boolean(logCartRecovery),
      });
    }

    return res.status(201).json({
      message: "تم إنشاء الكوبون بنجاح",
      coupon: serializeCoupon(populated),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل كوبون موجود
  PATCH /api/coupons/:id
*/
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "الكوبون غير موجود" });
    }

    const {
      code,
      type,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      maxUsage,
      maxUsagePerCustomer,
      startDate,
      endDate,
      scopeType,
      customerIds,
    } = req.body;

    const finalStart = startDate || coupon.startDate;
    const finalEnd = endDate || coupon.endDate;
    if (new Date(finalStart) >= new Date(finalEnd)) {
      return res
        .status(400)
        .json({ message: "تاريخ الانتهاء لازم يكون بعد تاريخ البداية" });
    }

    const fieldError = await validateCouponFields(req.body, { isEdit: true });
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    if (code?.trim()) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== coupon.code) {
        const existing = await Coupon.findOne({ code: normalizedCode });
        if (existing) {
          return res.status(409).json({ message: "هذا الكود مستخدم بالفعل" });
        }
        coupon.code = normalizedCode;
      }
    }

    const finalType = type || coupon.type;

    if (type) coupon.type = type;
    if (discountValue) coupon.discountValue = Number(discountValue);
    if (finalType === "percentage") {
      coupon.maxDiscountAmount = maxDiscountAmount
        ? Number(maxDiscountAmount)
        : null;
    } else if (type) {
      // تحويل النوع لمبلغ ثابت - الحد الأقصى للنسبة ما عاد له معنى
      coupon.maxDiscountAmount = null;
    }
    if (minOrderAmount !== undefined)
      coupon.minOrderAmount = Number(minOrderAmount) || 0;
    if (maxUsage !== undefined)
      coupon.maxUsage = maxUsage ? Number(maxUsage) : null;
    if (maxUsagePerCustomer)
      coupon.maxUsagePerCustomer = Number(maxUsagePerCustomer);
    if (startDate) coupon.startDate = startDate;
    if (endDate) coupon.endDate = endDate;

    if (scopeType) {
      coupon.scopeType = scopeType;
      coupon.customerIds =
        scopeType === "specific_customers" ? customerIds : [];
    }

    await coupon.save();
    const populated = await coupon.populate("customerIds", "fullName phone");

    return res.status(200).json({
      message: "تم تحديث الكوبون بنجاح",
      coupon: serializeCoupon(populated),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إيقاف / إعادة تفعيل كوبون بسرعة من غير فتح فورم التعديل كامل
  PATCH /api/coupons/:id/status
*/
exports.updateCouponActiveState = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "قيمة الحالة غير صالحة" });
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "الكوبون غير موجود" });
    }

    coupon.isActive = isActive;
    await coupon.save();
    const populated = await coupon.populate("customerIds", "fullName phone");

    return res.status(200).json({
      message: isActive ? "تم تفعيل الكوبون" : "تم إيقاف الكوبون",
      coupon: serializeCoupon(populated),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف كوبون
  DELETE /api/coupons/:id
  ⚠️ ما بيأثرش على الطلبات القديمة اللي استخدمته أصلاً - بياناتها Snapshot
  ثابت بموديل Order (couponCode/couponDiscount) وبتضل تعرض بالضبط شو
  استفاد منه الزبون وقتها، حتى لو الكوبون نفسه اتحذف نهائيًا بعدين
*/
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "الكوبون غير موجود" });
    }
    await coupon.deleteOne();
    return res.status(200).json({ message: "تم حذف الكوبون بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  خيارات مختصرة للزبائن (id + fullName + phone) عشان تتعرض كخيارات
  اختيار متعدد بفورم "زبائن محددين" - بحث بالاسم أو الهاتف لو ?search موجود
  نفس فلسفة offer.controller.js/getProductOptions بالضبط
  GET /api/coupons/customer-options?search=...
*/
exports.getCustomerOptions = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = search
      ? {
          $or: [
            { fullName: new RegExp(search, "i") },
            { phone: new RegExp(search, "i") },
          ],
        }
      : {};

    const customers = await Customer.find(filter)
      .select("fullName phone")
      .limit(30)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      customers: customers.map((c) => ({
        id: c._id,
        fullName: c.fullName,
        phone: c.phone,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

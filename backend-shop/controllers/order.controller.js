// user
const mongoose = require("mongoose");
const Order = require("../models/order");
const Customer = require("../models/customer");
const Product = require("../models/product");
const Coupon = require("../models/coupon");
const { attachEffectivePrice } = require("../utils/applyOffers");
const { evaluateCoupon } = require("../utils/couponEngine");
const { evaluateShipping } = require("../utils/shippingEngine");
const {
  buildLabelMaps,
  buildColorMap,
  resolveLabel,
} = require("../utils/resolveFilterLabels");
const {
  serializeOrderSummary,
  serializeOrderDetail,
} = require("../utils/serializeOrder");

const getPrimaryImage = (product) =>
  product.images?.find((img) => img.isPrimary)?.url ||
  product.images?.[0]?.url ||
  null;

/*
  order.controller.js
  ------------------------------------------------------------------
  تحويل السلة لطلب فعلي - على مرحلتين:

  1) تحقق + تسعير (بدون أي تعديل بالداتابيز): نبني بنود الطلب بالسعر
     الفعّال اللحظي (applyOffers.js) ونتأكد كل قطعة لسه منشورة ومتوفرة
     بالكمية المطلوبة. لو في أي قطعة مش متوفرة، بنرفض الطلب بالكامل قبل
     ما نلمس أي بيانات، ونوضح للزبون بالضبط شو المشكلة. بنفس المرحلة
     منعيد التحقق من الكوبون المطبّق (إن وجد) بشكل نهائي، وكمان منحسب
     سعر الشحن الفعلي والملزم حسب منطقة شحن الزبون (utils/shippingEngine.js)
     - نفس فلسفة تحقق المخزون بالضبط، لأنه ممكن يكون تغيّر شي (الأدمن
     أوقف الكوبون أو منطقة الشحن، أو خلصت صلاحية الكوبون) بين لحظة فتح
     صفحة الدفع ولحظة الضغط على "تأكيد الطلب"

  ⚠️ تحديث نظام الشحن: سعر الشحن ما عاد بيتحدد لكل قطعة لحالها ولا بيتخزن
  مسبقًا بالسلة - بيتحسب هون فقط، لحظة تحويل السلة لطلب، حسب مجموع
  السلة (subtotal) ومنطقة الشحن يلي الزبون اختارها (shippingZoneId +
  المدينة المرسلة بمعلومات التوصيل)

  2) تثبيت الطلب (Transaction حقيقية عبر MongoDB session): إنزال المخزون
     الفعلي لكل قطعة + زيادة عدّاد استخدام الكوبون (لو في) بشكل ذرّي +
     إنشاء مستند الطلب + تفريغ السلة وإلغاء الكوبون المطبّق - سوا كوحدة
     واحدة ذرية (Atomic). لو أي خطوة فشلت (مثلاً قطعة انباعت، أو الكوبون
     استُهلك بالكامل، لحظة قبل ما نوصل لهيك من طلب تاني بنفس الثانية)،
     كل شي بيتراجع تلقائيًا ومفيش نصف طلب أو نقص مخزون/استخدام كوبون
     بدون طلب فعلي مقابله

  ⚠️ الـ Transactions هون بتحتاج MongoDB شغّال كـ Replica Set (افتراضي
  بأي MongoDB Atlas cluster، يلي هو الغالب مع Render) - مش هتشتغل على
  MongoDB standalone عادي بدون replica set

  بيانات التوصيل بتتبعت من الفرونت جاهزة (معبّاة مسبقًا من بيانات حساب
  الزبون كقيم افتراضية بس قابلة للتعديل بالكامل) - مش هي مسؤولية
  الكنترولر يجيبها من الحساب، بس بيتحقق إنها موجودة كحد أدنى.
  shippingZoneId بيجي منفصل عن shipping (هو نتيجة اختيار الزبون لمدينته
  من قائمة مناطق الشحن الفعالة بصفحة الدفع - شوف GET /shop/shipping-zones)
*/
exports.createOrder = async (req, res) => {
  try {
    const { shipping, shippingZoneId } = req.body;

    if (
      !shipping ||
      !shipping.fullName?.trim() ||
      !shipping.phone?.trim() ||
      !shipping.address?.trim() ||
      !shipping.city?.trim()
    ) {
      return res
        .status(400)
        .json({ message: "الرجاء تعبئة معلومات التوصيل المطلوبة" });
    }

    const customer = await Customer.findById(req.customerAuth.id).select(
      "cart appliedCoupon",
    );
    if (!customer) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }
    if (customer.cart.length === 0) {
      return res.status(400).json({ message: "السلة فاضية" });
    }

    /* ---------------- المرحلة 1: تحقق + بناء البنود بالسعر اللحظي ---------------- */
    const productIds = customer.cart.map((line) => line.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = {};
    products.forEach((p) => (productsById[p._id.toString()] = p));

    const withPricing = await attachEffectivePrice(products);
    const pricingById = {};
    withPricing.forEach((p) => (pricingById[p._id.toString()] = p));

    const labelMaps = await buildLabelMaps(["brand"]);
    const colorMap = await buildColorMap();

    // ⚠️ بقى ممكن يكون فيه أكتر من سطر بالسلة لنفس المنتج (مقاس/لون
    // مختلف) - بس المخزون (product.quantity) مشترك بينهم. لازم نتحقق من
    // "مجموع" الكمية المطلوبة لكل منتج (عبر كل أسطره) مقابل المخزون
    // الفعلي، مش كل سطر لحاله - وإلا ممكن نقبل طلب مجموعه أكبر من
    // المتوفر فعليًا (مثال: نفس القطعة الوحيدة مطلوبة مرتين بمقاسين
    // مختلفين ونقبلها الاثنين لأن كل سطر لحاله شكله ضمن المخزون)
    const requestedQtyByProduct = {};
    customer.cart.forEach((line) => {
      const pid = line.productId.toString();
      requestedQtyByProduct[pid] =
        (requestedQtyByProduct[pid] || 0) + line.quantity;
    });

    const unavailableProductIds = new Set();
    const unavailableNames = [];
    for (const pid of Object.keys(requestedQtyByProduct)) {
      const product = productsById[pid];
      if (
        !product ||
        product.publishStatus !== "published" ||
        product.quantity < requestedQtyByProduct[pid]
      ) {
        unavailableProductIds.add(pid);
        unavailableNames.push(product?.name || "قطعة غير معروفة");
      }
    }

    if (unavailableNames.length > 0) {
      return res.status(409).json({
        message: `للأسف بعض القطع لم تعد متوفرة بالكمية المطلوبة: ${unavailableNames.join(
          "، ",
        )} - الرجاء مراجعة السلة`,
      });
    }

    const orderItems = [];
    let subtotal = 0;
    let totalOriginal = 0;

    for (const line of customer.cart) {
      const pid = line.productId.toString();
      if (unavailableProductIds.has(pid)) continue; // احتياطي - عمليًا ما بيصير لأننا رجعنا 409 فوق لو في أي منتج مش متوفر
      const product = productsById[pid];

      const priced = pricingById[pid];
      let price = priced.price;
      let originalPrice = null;
      let discountPercent = null;

      if (priced.discountEnabled && priced.discountPercent) {
        discountPercent = priced.discountPercent;
        originalPrice = priced.originalPrice || null;
      } else if (priced.appliedOffer) {
        discountPercent = priced.appliedOffer.discountPercent;
        price = priced.effectivePrice;
        originalPrice = priced.price;
      }

      const lineTotal = price * line.quantity;

      subtotal += lineTotal;
      totalOriginal += (originalPrice || price) * line.quantity;

      const colorInfo = line.color ? colorMap[line.color] : null;

      orderItems.push({
        productId: product._id,
        name: product.name,
        brand: resolveLabel(labelMaps.brand, product.brand) || "",
        image: getPrimaryImage(product),
        size: line.size,
        color: line.color,
        colorHex: colorInfo?.colorHex || null,
        quantity: line.quantity,
        price,
        originalPrice,
        discountPercent,
        lineTotal,
      });
    }

    // -------------------- التحقق النهائي من الكوبون (إن وجد) --------------------
    // نفس فلسفة تحقق المخزون فوق بالضبط: إعادة تحقق كاملة لحظة التأكيد،
    // مش الاعتماد على أي حالة قديمة كانت محفوظة وقت فتح السلة
    let couponResult = null;
    if (customer.appliedCoupon) {
      couponResult = await evaluateCoupon({
        code: customer.appliedCoupon,
        customerId: req.customerAuth.id,
        subtotal,
      });

      if (!couponResult.valid) {
        // الكوبون ما عاد صالح لحظة التأكيد - نلغيه تلقائيًا من الحساب
        // ونطلب من الزبون مراجعة السلة بدل ما نكمل الطلب بصمت بدونه
        customer.appliedCoupon = null;
        await customer.save();
        return res.status(409).json({
          message:
            couponResult.message ||
            "الكوبون لم يعد صالحًا، الرجاء مراجعة السلة",
        });
      }
    }
    const couponDiscount = couponResult ? couponResult.discountAmount : 0;

    // -------------------- التحقق النهائي من منطقة الشحن (ملزم) --------------------
    // نفس فلسفة الكوبون والمخزون بالضبط: ما بنوثق بأي سعر شحن جاي من
    // الفرونت - بنعيد حسابه من الصفر هون حسب مدينة الزبون الفعلية
    // ومجموع السلة الحقيقي (subtotal) يلي حسبناه فوق بالضبط
    const shippingResult = await evaluateShipping({
      zoneId: shippingZoneId,
      city: shipping.city,
      subtotal,
    });

    if (!shippingResult.valid) {
      return res.status(409).json({
        message: shippingResult.message,
      });
    }

    const shippingTotal = shippingResult.price;

    /* ---------------- المرحلة 2: تثبيت الطلب (Transaction) ---------------- */
    const session = await mongoose.startSession();
    let order;

    try {
      await session.withTransaction(async () => {
        for (const item of orderItems) {
          // إنزال ذري بشرط توفر الكمية لحظة التنفيذ نفسها - حماية أخيرة
          // من أي Race Condition صارت بين المرحلة 1 وهون بالضبط
          const updated = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              quantity: { $gte: item.quantity },
              publishStatus: "published",
            },
            { $inc: { quantity: -item.quantity } },
            { new: true, session },
          );

          if (!updated) {
            throw new Error("STOCK_RACE");
          }

          // القطعة خرجت من المخزون فعليًا - نفس المنطق المستخدم بصفحة
          // المخزون بلوحة تحكم الأدمن (الكمية صفر = مباعة)
          if (updated.quantity === 0) {
            updated.publishStatus = "sold";
            await updated.save({ session });
          }
        }

        // زيادة عدّاد استخدام الكوبون بشكل ذرّي - بنفس الفلسفة بالضبط
        // (شرط ضمن التحديث نفسه، مش تحقق منفصل قبله) عشان نتفادى إنه
        // اثنين يستخدموا آخر مقعد متبقي بنفس اللحظة بالضبط
        if (couponResult) {
          const updatedCoupon = await Coupon.findOneAndUpdate(
            {
              _id: couponResult.coupon._id,
              $or: [
                { maxUsage: null },
                { $expr: { $lt: ["$usageCount", "$maxUsage"] } },
              ],
            },
            { $inc: { usageCount: 1 } },
            { new: true, session },
          );

          if (!updatedCoupon) {
            throw new Error("COUPON_RACE");
          }
        }

        const [newOrder] = await Order.create(
          [
            {
              customerId: req.customerAuth.id,
              items: orderItems,
              shipping: {
                fullName: shipping.fullName.trim(),
                phone: shipping.phone.trim(),
                email: shipping.email?.trim() || "",
                address: shipping.address.trim(),
                city: shipping.city.trim(),
                region: shipping.region?.trim() || "",
                postalCode: shipping.postalCode?.trim() || "",
              },
              shippingZoneId: shippingResult.zone._id,
              shippingZoneName: shippingResult.zone.name,
              shippingDurationLabel: shippingResult.durationLabel,
              paymentMethod: "cash",
              subtotal,
              totalSavings: Math.max(0, totalOriginal - subtotal),
              shippingTotal,
              couponId: couponResult ? couponResult.coupon._id : null,
              couponCode: couponResult ? couponResult.coupon.code : null,
              couponDiscount,
              grandTotal:
                Math.max(0, subtotal - couponDiscount) + shippingTotal,
              // أول سطر بسجل تتبع الحالة - أساس شريط "تتبع الطلب" الحقيقي
              // بصفحة تفاصيل الطلب بلوحة تحكم الأدمن (شوف utils/orderStatusEngine.js)
              statusHistory: [
                {
                  status: "pending",
                  changedAt: new Date(),
                  note: "تم إنشاء الطلب",
                },
              ],
            },
          ],
          { session },
        );
        order = newOrder;

        customer.cart = [];
        customer.appliedCoupon = null;
        await customer.save({ session });
      });
    } catch (txError) {
      if (txError.message === "STOCK_RACE") {
        return res.status(409).json({
          message:
            "للأسف إحدى القطع بيعت للتو، الرجاء مراجعة السلة والمحاولة من جديد",
        });
      }
      if (txError.message === "COUPON_RACE") {
        return res.status(409).json({
          message:
            "تم استنفاد عدد مرات استخدام هذا الكوبون للتو، الرجاء إزالته من السلة والمتابعة",
        });
      }
      throw txError;
    } finally {
      session.endSession();
    }

    return res.status(201).json({ order: serializeOrderDetail(order) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  سجل طلبات الزبون (مختصر) - الأحدث أولًا
  GET /api/orders
*/
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.customerAuth.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      orders: orders.map(serializeOrderSummary),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تفاصيل طلب واحد (تأكيد الطلب + تتبعه لاحقًا) - نفس الصفحة تُستخدم
  للغرضين، مقتصرة على طلبات الزبون نفسه بس (ما بيقدر يشوف طلب زبون تاني)
  GET /api/orders/:id
*/
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف طلب غير صالح" });
    }

    const order = await Order.findOne({
      _id: id,
      customerId: req.customerAuth.id,
    });

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    return res.status(200).json({ order: serializeOrderDetail(order) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

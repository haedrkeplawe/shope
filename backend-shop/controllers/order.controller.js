// user
const mongoose = require("mongoose");
const Order = require("../models/order");
const Customer = require("../models/customer");
const Product = require("../models/product");
const { attachEffectivePrice } = require("../utils/applyOffers");
const {
  buildLabelMaps,
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
     ما نلمس أي بيانات، ونوضح للزبون بالضبط شو المشكلة

  2) تثبيت الطلب (Transaction حقيقية عبر MongoDB session): إنزال المخزون
     الفعلي لكل قطعة + إنشاء مستند الطلب + تفريغ السلة - سوا كوحدة واحدة
     ذرية (Atomic). لو أي خطوة فشلت (مثلاً قطعة انباعت لحظة قبل ما نوصل
     لهيك، من زبون تاني بنفس الثانية)، كل شي بيتراجع تلقائيًا ومفيش نصف
     طلب أو نقص مخزون بدون طلب فعلي مقابله

  ⚠️ الـ Transactions هون بتحتاج MongoDB شغّال كـ Replica Set (افتراضي
  بأي MongoDB Atlas cluster، يلي هو الغالب مع Render) - مش هتشتغل على
  MongoDB standalone عادي بدون replica set

  بيانات التوصيل بتتبعت من الفرونت جاهزة (معبّاة مسبقًا من بيانات حساب
  الزبون كقيم افتراضية بس قابلة للتعديل بالكامل) - مش هي مسؤولية
  الكنترولر يجيبها من الحساب، بس بيتحقق إنها موجودة كحد أدنى
*/
exports.createOrder = async (req, res) => {
  try {
    const { shipping } = req.body;

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
      "cart",
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

    const orderItems = [];
    const unavailableNames = [];
    let subtotal = 0;
    let totalOriginal = 0;
    let shippingTotal = 0;

    for (const line of customer.cart) {
      const pid = line.productId.toString();
      const product = productsById[pid];

      if (
        !product ||
        product.publishStatus !== "published" ||
        product.quantity < line.quantity
      ) {
        unavailableNames.push(product?.name || "قطعة غير معروفة");
        continue;
      }

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

      const shippingUnit = product.freeShipping
        ? 0
        : product.shippingPrice || 0;
      const lineTotal = price * line.quantity;

      subtotal += lineTotal;
      totalOriginal += (originalPrice || price) * line.quantity;
      shippingTotal += shippingUnit * line.quantity;

      orderItems.push({
        productId: product._id,
        name: product.name,
        brand: resolveLabel(labelMaps.brand, product.brand) || "",
        image: getPrimaryImage(product),
        size: line.size,
        quantity: line.quantity,
        price,
        originalPrice,
        discountPercent,
        shippingPrice: shippingUnit,
        lineTotal,
      });
    }

    if (unavailableNames.length > 0) {
      return res.status(409).json({
        message: `للأسف بعض القطع لم تعد متوفرة: ${unavailableNames.join(
          "، ",
        )} - الرجاء مراجعة السلة`,
      });
    }

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
              paymentMethod: "cash",
              subtotal,
              totalSavings: Math.max(0, totalOriginal - subtotal),
              shippingTotal,
              grandTotal: subtotal + shippingTotal,
            },
          ],
          { session },
        );
        order = newOrder;

        customer.cart = [];
        await customer.save({ session });
      });
    } catch (txError) {
      if (txError.message === "STOCK_RACE") {
        return res.status(409).json({
          message:
            "للأسف إحدى القطع بيعت للتو، الرجاء مراجعة السلة والمحاولة من جديد",
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

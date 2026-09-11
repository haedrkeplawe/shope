const mongoose = require("mongoose");
const Customer = require("../models/customer");
const Product = require("../models/product");
const Order = require("../models/order");
const { attachEffectivePrice } = require("../utils/applyOffers");
const { notifyCustomers } = require("../utils/notificationEngine");

/*
  favorite.controller.js (لوحة تحكم الأدمن)
  ------------------------------------------------------------------
  صفحة "المفضلة": تحليل تجميعي للمنتجات يلي الزبائن حاطينها بمفضلتهم -
  الهدف معرفة أكتر القطع يلي الزبائن بيحبوها (حتى لو ما اشتروها بعد)
  عشان الأدمن يقدر يستهدفها بعروض/خصومات بذكاء بدل التخمين

  ⚠️ ملاحظة مهمة عن "نسبة التحويل" (conversionRate):
  بما إنه المنصة Resale (القطعة الواحدة نسخة وحيدة أو كمية محدودة جدًا،
  مش مخزون مفتوح زي متجر عادي)، ما بينفع نحسبها بمفهومها التقليدي. هون
  بنحسبها كـ: من بين كل الزبائن يلي حفظوا هالقطعة بمفضلتهم، كم بالمئة
  منهم اشتراها فعليًا (عبر أي طلب حقيقي يحتوي هالمنتج) - مؤشر حقيقي "هل
  الحفظ بيتحوّل شراء فعلي" بدل رقم وهمي غير قابل للتحقق بهاد نوع المتاجر
*/

/*
  إحصائيات + قائمة المنتجات المحفوظة بمفضلة الزبائن دفعة وحدة
  GET /api/admin/favorites?sort=most_saved|conversion|price&page=&limit=
*/
exports.getFavoritesOverview = async (req, res) => {
  try {
    const {
      search = "",
      sort = "most_saved",
      page = 1,
      limit = 15,
    } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));

    // 1) تجميع المفضلة: لكل منتج، قائمة IDs الزبائن يلي حفظوه حاليًا
    const favoriteAgg = await Customer.aggregate([
      { $match: { "favorites.0": { $exists: true } } },
      { $project: { favorites: 1 } },
      { $unwind: "$favorites" },
      { $group: { _id: "$favorites", customerIds: { $push: "$_id" } } },
    ]);

    const emptyStats = {
      totalFavorites: 0,
      customersWithFavorites: 0,
      avgConversion: 0,
      soldOutFavorited: 0,
    };

    if (favoriteAgg.length === 0) {
      return res.status(200).json({
        stats: emptyStats,
        products: [],
        pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    const productIds = favoriteAgg.map((f) => f._id);
    const productIdSet = new Set(productIds.map((id) => id.toString()));

    const products = await Product.find({ _id: { $in: productIds } });
    const withPricing = await attachEffectivePrice(products);
    const pricingById = {};
    withPricing.forEach((p) => (pricingById[p._id.toString()] = p));

    // 2) لكل منتج، مين اشتراه فعليًا (من كل الطلبات يلي فيها أي منتج من
    // منتجات المفضلة) - خريطة productId -> Set(customerId المشتري)
    const orders = await Order.find({
      "items.productId": { $in: productIds },
    }).select("customerId items.productId");

    const purchasersByProduct = {};
    orders.forEach((order) => {
      const custId = order.customerId.toString();
      order.items.forEach((item) => {
        const pid = item.productId.toString();
        if (!productIdSet.has(pid)) return;
        if (!purchasersByProduct[pid]) purchasersByProduct[pid] = new Set();
        purchasersByProduct[pid].add(custId);
      });
    });

    let totalFavorites = 0;
    let soldOutFavorited = 0;
    const customerIdSet = new Set();
    const conversionRates = [];

    const rows = favoriteAgg
      .map((f) => {
        const pid = f._id.toString();
        const favoritesCount = f.customerIds.length;
        totalFavorites += favoritesCount;
        f.customerIds.forEach((cid) => customerIdSet.add(cid.toString()));

        const product = pricingById[pid];
        if (!product) return null; // المنتج اتحذف نهائيًا - نتجاهله بالعرض

        if (product.publishStatus === "sold") soldOutFavorited += 1;

        const favoriterIds = new Set(f.customerIds.map((c) => c.toString()));
        const purchasers = purchasersByProduct[pid] || new Set();
        let purchasedCount = 0;
        favoriterIds.forEach((cid) => {
          if (purchasers.has(cid)) purchasedCount += 1;
        });
        const conversionRate =
          favoritesCount > 0
            ? Math.round((purchasedCount / favoritesCount) * 100)
            : 0;
        conversionRates.push(conversionRate);

        let displayPrice = product.price;
        let hasDiscount = false;
        let discountPercent = null;
        if (product.discountEnabled && product.discountPercent) {
          discountPercent = product.discountPercent;
          hasDiscount = true;
        } else if (product.appliedOffer) {
          discountPercent = product.appliedOffer.discountPercent;
          displayPrice = product.effectivePrice;
          hasDiscount = true;
        }

        return {
          id: pid,
          name: product.name,
          sku: product.sku || null,
          image:
            product.images?.find((img) => img.isPrimary)?.url ||
            product.images?.[0]?.url ||
            null,
          publishStatus: product.publishStatus,
          quantity: product.quantity,
          price: displayPrice,
          originalPrice: hasDiscount ? product.price : null,
          discountPercent,
          hasDiscount,
          favoritesCount,
          conversionRate,
        };
      })
      .filter(Boolean);

    // -------------------- البحث (بعد بناء الصفوف عشان يشمل الاسم/الـ SKU الفعليين) --------------------
    let filteredRows = rows;
    if (search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      filteredRows = rows.filter(
        (r) => regex.test(r.name) || (r.sku && regex.test(r.sku)),
      );
    }

    const sortFns = {
      most_saved: (a, b) => b.favoritesCount - a.favoritesCount,
      conversion: (a, b) => b.conversionRate - a.conversionRate,
      price: (a, b) => b.price - a.price,
    };
    filteredRows.sort(sortFns[sort] || sortFns.most_saved);

    const total = filteredRows.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = filteredRows.slice(start, start + limitNum);

    // ⚠️ الإحصائيات محسوبة من كل المنتجات المحفوظة بالمتجر (rows) بغض
    // النظر عن نص البحث الحالي - نفس فلسفة صفحة "العملاء" (كروت الإحصائيات
    // مستقلة عن فلتر الجدول) عشان الأرقام تفضل تعكس الصورة الكاملة دائمًا
    const stats = {
      totalFavorites,
      customersWithFavorites: customerIdSet.size,
      avgConversion:
        conversionRates.length > 0
          ? Math.round(
              conversionRates.reduce((s, c) => s + c, 0) /
                conversionRates.length,
            )
          : 0,
      soldOutFavorited,
    };

    return res.status(200).json({
      stats,
      products: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إرسال إشعار "خصم جديد" لكل الزبائن يلي حاطين هالمنتج بمفضلتهم حاليًا -
  يشترط وجود خصم فعّال حاليًا على المنتج (يدوي أو من عرض جماعي نشط)،
  وإلا ما في شي حقيقي نبلّغهم فيه (استخدم "إضافة لعرض" أولًا)
  POST /api/admin/favorites/:productId/notify-discount
*/
exports.notifyFavoriteDiscount = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "معرّف منتج غير صالح" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    const [withPricing] = await attachEffectivePrice([product]);

    let discountPercent = null;
    let finalPrice = product.price;
    if (withPricing.discountEnabled && withPricing.discountPercent) {
      discountPercent = withPricing.discountPercent;
    } else if (withPricing.appliedOffer) {
      discountPercent = withPricing.appliedOffer.discountPercent;
      finalPrice = withPricing.effectivePrice;
    }

    if (!discountPercent) {
      return res.status(400).json({
        message:
          "هذا المنتج بدون خصم فعّال حاليًا - أضِفه لعرض أو فعّل خصمًا يدويًا عليه أولًا",
      });
    }

    const favoriters = await Customer.find({ favorites: productId }).select(
      "_id",
    );

    if (favoriters.length === 0) {
      return res
        .status(400)
        .json({ message: "لا يوجد زبائن حاطين هذا المنتج بمفضلتهم حاليًا" });
    }

    await notifyCustomers(
      favoriters.map((c) => c._id),
      {
        type: "favorite_discount",
        title: "🔥 خصم على قطعة بمفضلتك!",
        message: `"${product.name}" يلي حفظتها بمفضلتك عليها الآن خصم ${discountPercent}% - السعر الجديد ${finalPrice.toLocaleString(
          "en-US",
        )} ل.س`,
        link: `/product/${product._id}`,
        relatedId: product._id,
      },
    );

    return res
      .status(200)
      .json({ message: `تم إرسال إشعار الخصم لـ ${favoriters.length} عميل` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

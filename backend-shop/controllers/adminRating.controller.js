const mongoose = require("mongoose");
const Rating = require("../models/rating");
const Customer = require("../models/customer");
const Product = require("../models/product");

/*
  adminRating.controller.js
  ------------------------------------------------------------------
  إدارة التقييمات والتعليقات من لوحة تحكم الأدمن - الموافقة/الرفض/الحذف
  + إعادة حساب Cache متوسط وعدد التقييمات بموديل Product بعد أي عملية
  بتأثر على أي تقييم "معتمد" (approved)، عشان يضل متوافق مع القائمة
  العامة بصفحة المنتج بالضبط (شوف shop.controller.js → submitRating)

  ⚠️ تقييمات قديمة اتسجّلت قبل إضافة هاد النظام ما عندهاش حقل
  approvalStatus أصلاً بقاعدة البيانات - بيتعاملوا كـ"قيد المراجعة"
  بكل الاستعلامات تحت (نفس افتراضي الحقل بالضبط)، وبيترحّلوا تلقائيًا
  لقيمة صريحة أول ما السيرفر يشتغل (utils/seedDefaults.js →
  backfillRatingApprovalStatus)
*/

/*
  إعادة حساب واعتماد Cache متوسط/عدد تقييمات منتج معيّن بناءً على
  التقييمات المعتمدة (approved) بس - نفس المنطق المستخدم بـ
  shop.controller.js → submitRating بالضبط، بس هون بيتكرر بعد أي تغيير
  إداري (موافقة/رفض/حذف) مش بس وقت تقديم تقييم جديد
*/
const recalculateProductRatingCache = async (productId) => {
  const [stats] = await Rating.aggregate([
    { $match: { productId, approvalStatus: "approved" } },
    { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
  ]);

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0,
        ratingCount: stats ? stats.count : 0,
      },
    },
  );
};

/*
  إحصائيات صفحة التقييمات: متوسط التقييم العام (من المعتمد بس)، عدد
  قيد المراجعة، عدد معتمدة، عدد مرفوضة، الإجمالي
  GET /api/admin/ratings/stats
*/
exports.getRatingStats = async (req, res) => {
  try {
    const [counts, avgAgg] = await Promise.all([
      Rating.aggregate([
        { $group: { _id: "$approvalStatus", count: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        { $match: { approvalStatus: "approved" } },
        { $group: { _id: null, avg: { $avg: "$value" } } },
      ]),
    ]);

    const countMap = {};
    counts.forEach((c) => {
      // تقييمات قديمة بدون الحقل بترجع _id: null من $group - بنحسبها
      // "قيد المراجعة" (نفس الافتراضي تمامًا)
      const key = c._id || "pending";
      countMap[key] = (countMap[key] || 0) + c.count;
    });

    const pending = countMap.pending || 0;
    const approved = countMap.approved || 0;
    const rejected = countMap.rejected || 0;

    return res.status(200).json({
      stats: {
        averageRating: avgAgg[0] ? Math.round(avgAgg[0].avg * 10) / 10 : 0,
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  قائمة التقييمات - فلترة بحالة الموافقة + بحث (اسم/هاتف الزبون، اسم
  المنتج، نص التعليق) + تقسيم صفحات، الأحدث أولًا
  GET /api/admin/ratings
*/
exports.getRatings = async (req, res) => {
  try {
    const { status = "all", search, page = 1, limit = 15 } = req.query;

    const andConditions = [];

    if (status === "pending") {
      andConditions.push({
        $or: [
          { approvalStatus: "pending" },
          { approvalStatus: { $exists: false } },
        ],
      });
    } else if (status === "approved" || status === "rejected") {
      andConditions.push({ approvalStatus: status });
    } else if (status !== "all") {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");

      const [matchingCustomers, matchingProducts] = await Promise.all([
        Customer.find({
          $or: [{ fullName: regex }, { phone: regex }],
        }).select("_id"),
        Product.find({ name: regex }).select("_id"),
      ]);

      andConditions.push({
        $or: [
          { comment: regex },
          { customerId: { $in: matchingCustomers.map((c) => c._id) } },
          { productId: { $in: matchingProducts.map((p) => p._id) } },
        ],
      });
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));

    const [ratings, total] = await Promise.all([
      Rating.find(filter)
        .populate("customerId", "fullName phone")
        .populate("productId", "name images")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Rating.countDocuments(filter),
    ]);

    const serialized = ratings.map((r) => {
      const primaryImage =
        r.productId?.images?.find((img) => img.isPrimary)?.url ||
        r.productId?.images?.[0]?.url ||
        null;

      return {
        id: r._id,
        value: r.value,
        comment: r.comment || "",
        approvalStatus: r.approvalStatus || "pending",
        customer: r.customerId
          ? {
              id: r.customerId._id,
              fullName: r.customerId.fullName,
              phone: r.customerId.phone,
            }
          : null,
        product: r.productId
          ? {
              id: r.productId._id,
              name: r.productId.name,
              image: primaryImage,
            }
          : null,
        createdAt: r.createdAt,
      };
    });

    return res.status(200).json({
      ratings: serialized,
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
  الموافقة على تقييم / رفضه / إرجاعه لقيد المراجعة - وإعادة حساب Cache
  متوسط/عدد تقييمات المنتج المرتبط فورًا بكل الحالات
  PATCH /api/admin/ratings/:id/approval   body: { approvalStatus }
*/
exports.updateRatingApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف تقييم غير صالح" });
    }
    if (!["pending", "approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const rating = await Rating.findById(id);
    if (!rating) {
      return res.status(404).json({ message: "التقييم غير موجود" });
    }

    rating.approvalStatus = approvalStatus;
    await rating.save();

    await recalculateProductRatingCache(rating.productId);

    const labels = {
      approved: "تمت الموافقة على التقييم بنجاح",
      rejected: "تم رفض التقييم",
      pending: "تم إرجاع التقييم لقيد المراجعة",
    };

    return res.status(200).json({
      message: labels[approvalStatus],
      approvalStatus: rating.approvalStatus,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف تقييم نهائيًا (لتعليق مسيء/سبام) - وإعادة حساب Cache المنتج المرتبط
  DELETE /api/admin/ratings/:id
*/
exports.deleteRating = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف تقييم غير صالح" });
    }

    const rating = await Rating.findById(id);
    if (!rating) {
      return res.status(404).json({ message: "التقييم غير موجود" });
    }

    const productId = rating.productId;
    await rating.deleteOne();
    await recalculateProductRatingCache(productId);

    return res.status(200).json({ message: "تم حذف التقييم" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

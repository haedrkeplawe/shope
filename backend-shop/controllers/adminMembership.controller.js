const mongoose = require("mongoose");
const MembershipTier = require("../models/membershipTier");
const Customer = require("../models/customer");

/*
  adminMembership.controller.js
  ------------------------------------------------------------------
  إدارة نظام "العضويات والاشتراكات" من لوحة الأدمن - ⚠️ لا يوجد أي
  إنشاء أو حذف لباقة هون إطلاقًا (العدد ثابت 3: gold/silver/free، شوف
  models/membershipTier.js) - بس تعديل قيمهن + تفعيل/إيقاف + تعيين
  زبائن. محمي بصلاحية "memberships" (شوف middleware/authorize.js)

  ⚠️ السعر المعروض بكل باقة مرجعي بس - النظام ما بيحاسب ولا يجدّد ولا
  يتتبع أي دفع فعلي، فـ "الإيرادات الشهرية" بالإحصائيات تحت تقدير عرضي
  (سعر الباقة × عدد الأعضاء النشطين فيها) مش رقم محاسبي فعلي - موضّح
  بالتسمية بالفرونت
*/

const TIER_ORDER = ["gold", "silver", "free"];

const serializeTier = (tier) => ({
  id: tier._id,
  tierKey: tier.tierKey,
  displayName: tier.displayName,
  price: tier.price,
  discountPercentage: tier.discountPercentage,
  minPurchaseForDiscount: tier.minPurchaseForDiscount,
  freeShippingMinOrder: tier.freeShippingMinOrder,
  allowStacking: tier.allowStacking,
  earlyAccessDelayHours: tier.earlyAccessDelayHours,
  isActive: tier.isActive,
});

/*
  قائمة الباقات الثلاث + عدد الأعضاء الحاليين بكل وحدة + إحصائيات عامة
  (إجمالي الأعضاء، الإيرادات الشهرية التقديرية، نسبة النمو الشهري)
  GET /api/admin/memberships
*/
exports.getMembershipOverview = async (req, res) => {
  try {
    const tiers = await MembershipTier.find({});
    const tiersByKey = {};
    tiers.forEach((t) => (tiersByKey[t.tierKey] = t));

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 30);

    const [memberCounts, currentPeriodCount, prevPeriodCount] =
      await Promise.all([
        Customer.aggregate([
          { $match: { membershipTierId: { $ne: null } } },
          { $group: { _id: "$membershipTierId", count: { $sum: 1 } } },
        ]),
        Customer.countDocuments({
          membershipTierId: { $ne: null },
          membershipAssignedAt: { $gte: start },
        }),
        Customer.countDocuments({
          membershipTierId: { $ne: null },
          membershipAssignedAt: { $gte: prevStart, $lt: start },
        }),
      ]);

    const countsByTierId = {};
    memberCounts.forEach((row) => {
      countsByTierId[row._id.toString()] = row.count;
    });

    const totalActiveMembers = memberCounts.reduce(
      (sum, row) => sum + row.count,
      0,
    );

    // إيرادات شهرية تقديرية (عرضية بس) = مجموع (سعر الباقة × عدد أعضائها)
    const estimatedMonthlyRevenue = tiers.reduce((sum, tier) => {
      const count = countsByTierId[tier._id.toString()] || 0;
      return sum + tier.price * count;
    }, 0);

    let growthPercent = 0;
    if (prevPeriodCount > 0) {
      growthPercent =
        ((currentPeriodCount - prevPeriodCount) / prevPeriodCount) * 100;
    } else if (currentPeriodCount > 0) {
      growthPercent = 100;
    }

    const tiersResponse = TIER_ORDER.map((key) => {
      const tier = tiersByKey[key];
      if (!tier) return null;
      return {
        ...serializeTier(tier),
        memberCount: countsByTierId[tier._id.toString()] || 0,
      };
    }).filter(Boolean);

    return res.status(200).json({
      tiers: tiersResponse,
      stats: {
        totalActiveMembers,
        estimatedMonthlyRevenue: Math.round(estimatedMonthlyRevenue),
        growthPercent: Math.round(growthPercent * 10) / 10,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل قيم باقة موجودة - ⚠️ tierKey/isSystem غير قابلين للتغيير أبدًا،
  ولا يوجد إنشاء/حذف عبر هذا الكنترولر إطلاقًا
  PATCH /api/admin/memberships/:tierKey
*/
exports.updateMembershipTier = async (req, res) => {
  try {
    const { tierKey } = req.params;

    const tier = await MembershipTier.findOne({ tierKey });
    if (!tier) {
      return res.status(404).json({ message: "باقة غير موجودة" });
    }

    const {
      displayName,
      price,
      discountPercentage,
      minPurchaseForDiscount,
      freeShippingMinOrder,
      allowStacking,
      earlyAccessDelayHours,
      isActive,
    } = req.body;

    if (displayName !== undefined) tier.displayName = displayName.trim();
    if (price !== undefined) tier.price = Math.max(0, Number(price));
    if (discountPercentage !== undefined) {
      tier.discountPercentage = Math.min(
        100,
        Math.max(0, Number(discountPercentage)),
      );
    }
    if (minPurchaseForDiscount !== undefined) {
      tier.minPurchaseForDiscount = Math.max(0, Number(minPurchaseForDiscount));
    }
    if (freeShippingMinOrder !== undefined) {
      tier.freeShippingMinOrder = Math.max(0, Number(freeShippingMinOrder));
    }
    if (allowStacking !== undefined)
      tier.allowStacking = Boolean(allowStacking);
    if (earlyAccessDelayHours !== undefined) {
      tier.earlyAccessDelayHours = Math.max(0, Number(earlyAccessDelayHours));
    }
    if (isActive !== undefined) {
      // ⚠️ الباقة المجانية معاملة كسلوك طبيعي ثابت دايمًا - ما فيها
      // خيار إيقاف فعليًا، بطلب صريح من صاحب المشروع
      if (tierKey === "free" && isActive === false) {
        return res.status(400).json({
          message: "الباقة المجانية سلوك أساسي بالمتجر ولا يمكن إيقافها",
        });
      }
      tier.isActive = Boolean(isActive);
    }

    await tier.save();

    return res.status(200).json({
      message: "تم تحديث الباقة بنجاح",
      tier: serializeTier(tier),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  بحث عن زبون لتعيينه بباقة (نفس نمط البحث المستخدم بتعيين المسوّقين
  بالضبط - شوف adminMarketer.controller.js → getCustomerOptions)
  GET /api/admin/memberships/customer-options?search=
*/
exports.getCustomerOptions = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {};
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      filter.$or = [{ fullName: regex }, { phone: regex }];
    }

    const customers = await Customer.find(filter)
      .select("fullName phone email membershipTierId")
      .populate("membershipTierId", "displayName tierKey")
      .limit(30)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      customers: customers.map((c) => ({
        id: c._id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email || "",
        currentTierName: c.membershipTierId?.displayName || "العضوية المجانية",
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  أعضاء باقة معيّنة (لزر "عرض الأعضاء" بكل بطاقة)
  GET /api/admin/memberships/:tierKey/members
*/
exports.getTierMembers = async (req, res) => {
  try {
    const { tierKey } = req.params;

    const tier = await MembershipTier.findOne({ tierKey });
    if (!tier) {
      return res.status(404).json({ message: "باقة غير موجودة" });
    }

    const members = await Customer.find({ membershipTierId: tier._id })
      .select("fullName phone email membershipAssignedAt")
      .sort({ membershipAssignedAt: -1 });

    return res.status(200).json({
      tier: serializeTier(tier),
      members: members.map((m) => ({
        id: m._id,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email || "",
        assignedAt: m.membershipAssignedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  آخر المشتركين الجدد (بأي باقة مدفوعة) - لواجهة "المشتركون الجدد"
  GET /api/admin/memberships/recent-subscribers
*/
exports.getRecentSubscribers = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;

    const members = await Customer.find({ membershipTierId: { $ne: null } })
      .select("fullName email membershipTierId membershipAssignedAt")
      .populate("membershipTierId", "displayName tierKey")
      .sort({ membershipAssignedAt: -1 })
      .limit(limit);

    return res.status(200).json({
      subscribers: members.map((m) => ({
        id: m._id,
        fullName: m.fullName,
        email: m.email || "",
        tierName: m.membershipTierId?.displayName || "",
        assignedAt: m.membershipAssignedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعيين/تغيير باقة زبون - tierKey: "free" بيرجعه صراحة للباقة المجانية
  (membershipTierId: null) - كل شي يدوي بالكامل من الأدمن، بلا أي تفعيل
  ذاتي من الزبون نفسه
  PATCH /api/admin/memberships/assign   body: { customerId, tierKey }
*/
exports.assignCustomerTier = async (req, res) => {
  try {
    const { customerId, tierKey } = req.body;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "معرّف زبون غير صالح" });
    }
    if (!TIER_ORDER.includes(tierKey)) {
      return res.status(400).json({ message: "باقة غير صالحة" });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "الزبون غير موجود" });
    }

    if (tierKey === "free") {
      customer.membershipTierId = null;
    } else {
      const tier = await MembershipTier.findOne({ tierKey });
      if (!tier) {
        return res.status(404).json({ message: "باقة غير موجودة" });
      }
      customer.membershipTierId = tier._id;
    }
    customer.membershipAssignedAt = new Date();

    await customer.save();

    return res.status(200).json({
      message: "تم تحديث باقة الزبون بنجاح",
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        membershipTierId: customer.membershipTierId,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

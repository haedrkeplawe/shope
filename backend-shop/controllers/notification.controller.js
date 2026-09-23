const mongoose = require("mongoose");
const Notification = require("../models/notification");

/*
  notification.controller.js (واجهة الزبون)
  ------------------------------------------------------------------
  قراءة/تحديد كمقروء لإشعارات الزبون الحالي بس (verifyCustomer) - إنشاء
  الإشعارات الفعلي بيصير من أماكن تانية بالنظام عبر utils/notificationEngine.js
  (تحديث حالة الطلب، خصم على مفضلة، كوبون، تذكير سلة متروكة...) مش من هون
*/

/*
  قائمة إشعارات الزبون - الأحدث أولًا، بحد أقصى 50 إشعار (كافي حاليًا،
  مفيش داعي لباجينيشن كامل بهاد الحجم من البيانات لكل زبون)
  GET /api/notifications
*/
exports.getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ customerId: req.customerAuth.id })
        .sort({ createdAt: -1 })
        .limit(50),
      Notification.countDocuments({
        customerId: req.customerAuth.id,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        relatedId: n.relatedId,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  عدد الإشعارات غير المقروءة بس - خفيف، لتحديث نقطة الجرس بالهيدر بشكل
  متكرر بدون ما نجيب كل الإشعارات كل مرة
  GET /api/notifications/unread-count
*/
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      customerId: req.customerAuth.id,
      isRead: false,
    });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تحديد إشعار واحد كمقروء - بيتأكد إنه الإشعار فعلًا تابع للزبون الحالي
  (customerId بالفلتر نفسه) عشان زبون ما يقدر يعلّم إشعارات زبون تاني
  PATCH /api/notifications/:id/read
*/
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرّف إشعار غير صالح" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, customerId: req.customerAuth.id },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "الإشعار غير موجود" });
    }

    return res.status(200).json({ message: "تم تحديد الإشعار كمقروء" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تحديد كل إشعارات الزبون كمقروءة دفعة وحدة
  PATCH /api/notifications/read-all
*/
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { customerId: req.customerAuth.id, isRead: false },
      { $set: { isRead: true } },
    );
    return res.status(200).json({ message: "تم تحديد كل الإشعارات كمقروءة" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

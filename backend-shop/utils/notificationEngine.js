const Notification = require("../models/notification");

/*
  utils/notificationEngine.js
  ------------------------------------------------------------------
  نقطة مركزية وحيدة لإنشاء إشعارات الزبائن - أي جزء بالنظام (تحديث حالة
  طلب، خصم على منتج مفضّل، كوبون جديد، تذكير سلة متروكة...) لازم يمرّ من
  هون، مش ينشئ Notification.create مباشرة بمكان تاني بالكود - عشان أي
  قاعدة مستقبلية (مثلاً إشعارات Push حقيقية أو تفضيلات إيقاف نوع معيّن
  من الزبون) تنضاف بمكان وحد بس، بنفس فلسفة couponEngine.js/applyOffers.js

  createNotification: زبون واحد (تحديث حالة طلب، تذكير سلة...)
  notifyCustomers: مجموعة زبائن دفعة وحدة (insertMany - أداء أسرع بكتير
  من حلقة create منفصلة لكل زبون، مهم لو المنتج المفضّل عليه عشرات الزبائن)
*/
const createNotification = async ({
  customerId,
  type,
  title,
  message,
  link = null,
  relatedId = null,
}) => {
  return Notification.create({
    customerId,
    type,
    title,
    message,
    link,
    relatedId,
  });
};

const notifyCustomers = async (
  customerIds,
  { type, title, message, link = null, relatedId = null },
) => {
  if (!Array.isArray(customerIds) || customerIds.length === 0) return [];

  const docs = customerIds.map((customerId) => ({
    customerId,
    type,
    title,
    message,
    link,
    relatedId,
  }));

  return Notification.insertMany(docs);
};

module.exports = { createNotification, notifyCustomers };

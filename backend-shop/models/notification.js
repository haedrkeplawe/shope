const mongoose = require("mongoose");

/*
  موديل الإشعار (Notification)
  ------------------------------------------------------------------
  إشعارات موجهة لزبون واحد بالتحديد - تُعرض بصفحة "الإشعارات" عند
  الزبون (رابط /notifications بالهيدر). أنواع الإشعار الحالية:

  - order_status: تحديث حالة طلب (تلقائي من adminOrder.controller عند
    كل تغيير حالة فعلي - شوف orderStatusEngine.js)
  - favorite_discount: تنبيه بخصم جديد على منتج بمفضلة الزبون (يدوي،
    من صفحة "المفضلة" بالأدمن)
  - coupon: وصول كوبون خصم مخصص (يدوي، عند إنشاء كوبون scopeType:
    specific_customers مع تفعيل خيار "إرسال إشعار فوري")
  - cart_reminder: تذكير بمنتجات ناسيها بالسلة (يدوي، من صفحة "السلات
    المتروكة" بالأدمن)
  - marketer_sale: إشعار للمسوق نفسه بعملية بيع جديدة استخدمت رمزه
    (تلقائي، من order.controller.js لحظة إنشاء الطلب) - وإشعار تاني له
    لما نفس الطلب يوصل لحالة "تم التسليم" (عمولته صارت مؤكدة نهائيًا -
    شوف adminOrder.controller.js)

  link: مسار نسبي بواجهة الزبون تودّي له الإشعار عند الضغط عليه (اختياري)
  relatedId: مرجع عام (منتج/طلب/كوبون حسب النوع) - للعرض والسياق فقط،
  بدون Populate تلقائي (بيختلف الموديل المرجعي حسب type)

  ⚠️ نفس فلسفة النظام بالكامل: الإنشاء الفعلي لأي إشعار لازم يمر حصرًا
  من utils/notificationEngine.js (نقطة مركزية وحيدة) مش Notification.create
  مباشرة من أي كنترولر - عشان أي قاعدة مستقبلية (تفضيلات إيقاف نوع معيّن
  من الزبون، Push حقيقي...) تنضاف بمكان وحد بس
*/
const notificationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "order_status",
        "favorite_discount",
        "coupon",
        "cart_reminder",
        "marketer_sale",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// فهرس مركّب: أسرع استعلام ممكن لأكثر عملية متكررة (قائمة إشعارات زبون
// معيّن، الأحدث أولًا) - نفس الاستعلام المستخدم بكل مرة تُفتح فيها الصفحة
notificationSchema.index({ customerId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

const mongoose = require("mongoose");

/*
  db.js
  ------------------------------------------------------------------
  ⚠️ تحديث: الاتصال الأصلي كان بيعمل process.exit(1) على أي خطأ اتصال،
  حتى لو كان تذبذب شبكة/DNS مؤقت (زي querySrv ESERVFAIL) - يعني أي
  انقطاع بسيط لحظي كان بيكرش السيرفر كامل بدل ما يعيد المحاولة.

  التحديث هون بيعمل شيئين:
  1) أول اتصال: بيعيد المحاولة عدة مرات (بفاصل زمني متصاعد) قبل ما
     يستسلم فعليًا - عشان يمتص أي تذبذب DNS/شبكة لحظي وقت الإقلاع
  2) بعد ما يتصل بنجاح: بيراقب أحداث الاتصال (error/disconnected/
     reconnected) ويسجّلها بس، من غير ما يكرش السيرفر - mongoose نفسه
     بيحاول يعيد الاتصال تلقائيًا بالخلفية (سلوك افتراضي مع الـ driver
     الحديث)، إحنا بس بنراقب ونسجّل عشان نعرف شو صاير بالـ logs
*/

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000; // بيتضاعف كل محاولة (3s, 6s, 9s...)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetry = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB متصل: ${conn.connection.host}`);
  } catch (error) {
    console.error(
      `❌ خطأ في الاتصال بقاعدة البيانات (محاولة ${attempt}/${MAX_RETRIES}): ${error.message}`,
    );

    if (attempt >= MAX_RETRIES) {
      console.error(
        "❌ فشل الاتصال بقاعدة البيانات بعد عدة محاولات - تأكد من الشبكة/DNS أو حالة الكلستر بلوحة Atlas",
      );
      process.exit(1);
    }

    await wait(RETRY_DELAY_MS * attempt);
    return connectWithRetry(attempt + 1);
  }
};

const connectDB = async () => {
  await connectWithRetry();

  // ⚠️ مراقبة بس - ما بتكرش السيرفر، بس بتسجّل شو صاير بالـ logs عشان
  // تقدر تفرّق بين "الشبكة رجعت لحالها لوحدها" و"لسه في مشكلة مستمرة"
  mongoose.connection.on("error", (error) => {
    console.error(`⚠️ خطأ اتصال قاعدة البيانات: ${error.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn(
      "⚠️ انقطع الاتصال بقاعدة البيانات - mongoose بيحاول يعيد الاتصال تلقائيًا...",
    );
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✅ رجع الاتصال بقاعدة البيانات");
  });
};

module.exports = connectDB;

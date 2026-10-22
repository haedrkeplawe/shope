// utils/otpProvider.js
// إرسال رمز التحقق (OTP) عبر واتساب الرسمي من خلال Wevlix - بديل Aman Gate
// (SMS) اللي كان بـ utils/smsProvider.js. نفس النمط المعتمد بمشروع
// المطعم (NomNow): ملف جديد بالواجهة نفسها، وsmsProvider.js بيضل
// موجود بدون أي تعديل (غير مستخدم حاليًا) لو احتجنا نرجع له.
//
// الواجهة: otpProvider.send(phone, code, lang) → Promise<boolean>
//   phone: "09XXXXXXXX" أو "+963XXXXXXXXX" (منحوّلها لصيغة دولية تلقائيًا)
//   code : 6 أرقام (أو 4) - lang: "ar" | "en" (افتراضي "ar" - طراز عربي بالكامل)
//   بيرجع true إذا Wevlix قبل الطلب، و false إذا فشل (ما بيرمي exception أبدًا).
//
// الكود بيتولّد وبيتخزّن وبيتحقق منه عندنا بالـ backend (customer.controller.js
// / store.controller.js)؛ Wevlix بس بيوصّله.
//
// Env vars:
//   WEVLIX_API_KEY  — مفتاح المشروع من لوحة Wevlix (Live key). مطلوب بالإنتاج.
//   WEVLIX_API_URL  — اختياري، افتراضي https://api.wevlix.com
//
// ⚠️ لوحة Wevlix ← WhatsApp ← OTP Fallback: خلّي Telegram و SMS مطفيين.
// ⚠️ إذا WEVLIX_API_KEY مو مضبوط: بالتطوير بنطبع الكود بالكونسول (نفس سلوك
//    smsProvider السابق)، وبالإنتاج (NODE_ENV=production) بنرجع false
//    وما منزيّف نجاح.
//
// ⚠️ ملاحظة بخصوص "SMS_DEBUG_MODE": هاد الملف مسؤول بس عن الإرسال الفعلي
// (أو الطباعة بالكونسول لو ما في مفتاح) - إرجاع الـotp صراحة برد الـAPI
// (لمرحلة الاختبار) منطقه بالكنترولرات نفسها عبر SMS_DEBUG_MODE، ما تغيّر.

const DEFAULT_API_URL = "https://api.wevlix.com";
const REQUEST_TIMEOUT_MS = 10000;

const toDigits = (phone) => String(phone || "").replace(/\D/g, "");

const toGsm = (phone) => {
  const digits = toDigits(phone);
  // ⚠️ رقم الموظف (Staff) بلوحة الأدمن بيتسجّل بصيغة محلية "09XXXXXXXX"
  // (شوف StaffFormModal.jsx)، بينما رقم الزبون بيتسجّل بصيغة دولية
  // "+963XXXXXXXXX". واتساب (Wevlix) بيحتاج الصيغة الدولية الكاملة، فمنحوّل
  // المحلية تلقائيًا هون قبل الإرسال عشان أرقام الموظفين تشتغل بدون ما
  // نغيّر شي بفورم إضافة الموظف نفسه
  if (/^09\d{8}$/.test(digits)) {
    return `963${digits.slice(1)}`;
  }
  return digits; // أصلاً دولي (963xxxxxxxxx بعد تنظيف الـ+) أو صيغة تانية
};

// رقم موبايل سوري صالح (محليًا 09XXXXXXXX أو دوليًا +963XXXXXXXXX) - بيرجع
// الرقم بصيغته الدولية النظيفة (بدون +) لو صالح، أو null لو مش صالح
const normalizeSyrianPhone = (phone) => {
  const gsm = toGsm(phone);
  return /^963[9]\d{8}$/.test(gsm) ? gsm : null;
};

// الصيغة اللي بيتوقعها Wevlix: "+963XXXXXXXXX"
const toE164 = (phone) => {
  const gsm = toGsm(phone);
  return gsm ? `+${gsm}` : "";
};

module.exports = {
  /**
   * تحقّق مبكر: هل هاد الرقم يشبه رقم موبايل سوري صالح (محليًا أو دوليًا)؟
   * مفيد وقت التسجيل (registerCustomer/createStaff) قبل ما نوصل لمرحلة
   * الإرسال الفعلي - بيقبل "09XXXXXXXX" أو "+963XXXXXXXXX" بلا فرق
   * (نفس الدالة القديمة بـ smsProvider، منقولة هون بدون أي تغيير بالسلوك)
   * @param {string} phone
   * @returns {boolean}
   */
  isValidSyrianPhone: (phone) => normalizeSyrianPhone(phone) !== null,

  /**
   * إرسال رمز تحقق (OTP) عبر واتساب.
   * @param {string} phone - مثال: "+963912345678" أو "0912345678"
   * @param {string} code  - رمز التحقق، مثال: "482910"
   * @param {"ar"|"en"} lang - لغة الرسالة (افتراضي "ar")
   * @returns {Promise<boolean>} true إذا قُبل الطلب للإرسال فعليًا، false غير ذلك
   */
  send: async (phone, code, lang = "ar") => {
    // نقرأ الـ env وقت الاستدعاء (مو وقت تحميل الملف) حتى ما يتأثر بترتيب dotenv
    const apiKey = process.env.WEVLIX_API_KEY;
    const apiUrl = process.env.WEVLIX_API_URL || DEFAULT_API_URL;

    const to = toE164(phone);
    const otp = String(code || "");

    if (!to || !otp) {
      console.error("❌ OTP Error: رقم الهاتف والرمز مطلوبين");
      return false;
    }

    // Wevlix بيقبل كود من 4 أو 6 أرقام بالضبط
    if (!/^(\d{4}|\d{6})$/.test(otp)) {
      console.error("❌ OTP Error: الرمز لازم يكون 4 أو 6 أرقام بالضبط");
      return false;
    }

    // 🧪 بدون مفتاح
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        console.error("❌ OTP Error: WEVLIX_API_KEY غير مضبوط بالإنتاج");
        return false;
      }
      console.log("====================================");
      console.log(
        "💬 Fake WhatsApp OTP (Dev Mode — WEVLIX_API_KEY غير مُعرَّف)",
      );
      console.log("إلى:", to);
      console.log("الرمز:", otp);
      console.log("====================================");
      return true;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${apiUrl}/v1/otp/send`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          code: otp,
          locale: lang === "en" ? "en" : "ar",
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success === true) {
        console.log(
          `💬 WhatsApp OTP queued — to=${to} messageId=${data?.data?.messageId} status=${data?.data?.status}`,
        );
        return true;
      }

      // مثال: INSUFFICIENT_BALANCE / WHATSAPP_DESTINATION_COUNTRY_RESTRICTED / UNAUTHORIZED
      // كلها بترجع false، الكولر بيقرر شو يعرض
      console.error(
        `❌ WhatsApp OTP failed [${res.status}] code=${data?.error?.code} message=${data?.error?.message} requestId=${data?.meta?.requestId}`,
      );
      return false;
    } catch (err) {
      console.error("❌ WhatsApp OTP request error:", err.message);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  },
};

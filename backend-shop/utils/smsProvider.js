// utils/smsProvider.js
// إرسال رمز التحقق (OTP) عبر SMS باستخدام Aman Gate - بوابة SMS سورية،
// نفس المزود المعتمد بمشروع "طراز" الشقيق (تطبيق المطعم)، بما إنو النظام
// كله هون أصلاً مبني على سوريا (الليرة السورية، اللغة، إلخ)
//
// Env vars المطلوبة:
//   AMAN_GATE_API_TOKEN        — من قسم "المطور" بلوحة تحكم Aman Gate
//   AMAN_GATE_TEMPLATE_ID_EN   — id قالب OTP الإنجليزي (افتراضي "1" — English Default)
//   AMAN_GATE_TEMPLATE_ID_AR   — id قالب OTP العربي (افتراضي "2" — Arabic Default)
//   AMAN_GATE_BASE_URL         — اختياري، افتراضي https://aman-gate.com/api
//
// ⚠️ Aman Gate يغطي حاليًا الأرقام السورية (+963) فقط. إذا ما كان
// AMAN_GATE_API_TOKEN مضبوط (بيئة محلية/تطوير بدون توكن فعلي بعد)، منرجع
// لسلوك "وضع تجريبي" (بيطبع الرمز بالكونسول بس) حتى ما تنكسر البيئة
// المحلية أو التطوير قبل ربط حساب Aman Gate فعلي
//
// ⚠️ ملاحظة مهمة بخصوص "SMS_DEBUG_MODE": هاد الملف مسؤول بس عن الإرسال
// الفعلي (أو الطباعة بالكونسول لو ما في توكن) - إرجاع الـotp صراحة برد
// الـAPI (عشان يظهر بواجهة الزبون/الأدمن بمرحلة الاختبار الحالية) منطقه
// موجود بالكنترولرات نفسها (customer.controller.js / store.controller.js)
// عن طريق متغيّر بيئة منفصل SMS_DEBUG_MODE - راجع شرحه هناك

const AMAN_GATE_BASE_URL =
  process.env.AMAN_GATE_BASE_URL || "https://aman-gate.com/api";
const AMAN_GATE_API_TOKEN = process.env.AMAN_GATE_API_TOKEN;
// Aman Gate بيوفر قالبين افتراضيين جاهزين ومعتمدين على كل حساب (English
// Default و Arabic Default) - الافتراضي هون (1/2) لازم يطابق الـid الفعلي
// المتحقق منه بلوحة التحكم، وقابل للتغيير عبر الـenv لو تغيّر لاحقًا
const AMAN_GATE_TEMPLATE_ID_EN = process.env.AMAN_GATE_TEMPLATE_ID_EN || "1";
const AMAN_GATE_TEMPLATE_ID_AR = process.env.AMAN_GATE_TEMPLATE_ID_AR || "2";
const REQUEST_TIMEOUT_MS = 10000;

const toGsm = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  // ⚠️ اكتشفت أثناء الفحص إنه رقم الموظف (Staff) بلوحة الأدمن بيتسجّل
  // بصيغة محلية "09XXXXXXXX" (10 أرقام، شوف StaffFormModal.jsx)، بينما
  // رقم الزبون بيتسجّل بصيغة دولية "+963XXXXXXXXX" - الحقلين نفس
  // findAccountByPhone/Customer.findOne بيشتغلو صح مع أي صيغة (مطابقة
  // نصية بسيطة)، لكن Aman Gate بالذات بيحتاج الصيغة الدولية (963...)
  // حصرًا - فمنحوّل الصيغة المحلية تلقائيًا هون قبل الإرسال، عشان أرقام
  // الموظفين تشتغل بدون ما نغيّر شي بفورم إضافة الموظف نفسه
  if (/^09\d{8}$/.test(digits)) {
    return `963${digits.slice(1)}`;
  }
  return digits; // أصلاً دولي (963xxxxxxxxx بعد تنظيف الـ+) أو صيغة تانية
};
const isSyrianNumber = (phone) => toGsm(phone).startsWith("963");
// رقم موبايل سوري صالح (محليًا 09XXXXXXXX أو دوليًا +963XXXXXXXXX) - نفس
// المنطق اللي smsProvider.send نفسه بيعتمد عليه، بس مصدَّر لاستخدامه
// كتحقّق مبكر وقت التسجيل (registerCustomer/createStaff) قبل ما نوصل
// لمرحلة الإرسال الفعلي أصلاً - بيرجع الرقم بصيغته الدولية النظيفة لو
// صالح، أو null لو مش صالح
const normalizeSyrianPhone = (phone) => {
  const gsm = toGsm(phone);
  return /^963[9]\d{8}$/.test(gsm) ? gsm : null;
};

module.exports = {
  /**
   * تحقّق مبكر: هل هاد الرقم يشبه رقم موبايل سوري صالح (محليًا أو دوليًا)؟
   * مفيد وقت التسجيل (registerCustomer/createStaff) قبل ما نوصل لمرحلة
   * الإرسال الفعلي - بيقبل "09XXXXXXXX" أو "+963XXXXXXXXX" بلا فرق
   * @param {string} phone
   * @returns {boolean}
   */
  isValidSyrianPhone: (phone) => normalizeSyrianPhone(phone) !== null,

  /**
   * إرسال رمز تحقق (OTP) عبر SMS.
   * @param {string} phone - رقم دولي كامل، مثال: "+963912345678"
   * @param {string} code  - رمز التحقق، مثال: "482910"
   * @param {"ar"|"en"} lang - لغة الرسالة (افتراضي "ar" - طراز عربي بالكامل)
   * @returns {Promise<boolean>} true إذا قُبل الطلب للإرسال فعليًا، false غير ذلك
   */
  send: async (phone, code, lang = "ar") => {
    if (!phone || !code) {
      console.error("❌ SMS Error: رقم الهاتف والرمز مطلوبين");
      return false;
    }

    // 🧪 وضع التطوير — لا يوجد Token مُعدّ بعد، لا نكسر البيئة المحلية
    if (!AMAN_GATE_API_TOKEN) {
      console.log("====================================");
      console.log("📩 Fake SMS (Dev Mode — AMAN_GATE_API_TOKEN غير مُعرَّف)");
      console.log("إلى:", phone);
      console.log("الرمز:", code);
      console.log("====================================");
      return true;
    }

    const templateId =
      lang === "en" ? AMAN_GATE_TEMPLATE_ID_EN : AMAN_GATE_TEMPLATE_ID_AR;

    if (!templateId) {
      console.error(`❌ SMS Error: لا يوجد قالب Aman Gate معدّ للغة "${lang}"`);
      return false;
    }

    if (!isSyrianNumber(phone)) {
      // Aman Gate لا يغطي حاليًا غير الأرقام السورية (+963)
      console.error(
        `❌ SMS Error: Aman Gate لا يدعم هذا الرقم حاليًا: ${phone}`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${AMAN_GATE_BASE_URL}/otp/send/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${AMAN_GATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gsm: toGsm(phone),
          template_id: Number(templateId),
          code,
          language: lang === "en" ? 1 : 0, // Aman Gate: 0 = Arabic, 1 = English
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        console.log(
          `📩 Aman Gate: تم إرسال OTP — id=${data.id} gsm=${toGsm(phone)}`,
        );
        return true;
      }

      // 400 (validation) / 401 (invalid token) / 402 (no subscription/quota)
      // / 403 (IP not whitelisted) — كلها بترجع false، الكولر بيقرر شو يعرض
      console.error(`❌ Aman Gate Error [${res.status}]:`, data);
      return false;
    } catch (err) {
      console.error("❌ Aman Gate Request Failed:", err.message);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  },
};

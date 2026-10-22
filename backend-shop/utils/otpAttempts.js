/*
  utils/otpAttempts.js
  ------------------------------------------------------------------
  حد المحاولات الغلط لرمز التحقق - على مستوى الحساب نفسه (مش الـ IP)

  حدود الـ IP (middleware/rateLimiters.js) بتنكسر لو المهاجم بدّل أجهزته
  أو شبكاته. هون الحد مربوط بالرمز نفسه: بعد MAX_OTP_ATTEMPTS محاولات غلط
  الرمز بينلغى كليًا، والطريقة الوحيدة للمتابعة طلب رمز جديد (وهاد بدوره
  محدود بمهلة 45 ثانية + حد الإرسال بالساعة). يعني تخمين رمز من 6 أرقام
  (مليون احتمال) صار عمليًا مستحيل

  نوعين رموز، كل واحد إله عدّاده المستقل (متل ما الرموز نفسها مستقلة):
  - OTP_LOGIN: رمز تسجيل الدخول (otpCode / otpExpiresAt)
  - OTP_PASSWORD_RESET: رمز "نسيت كلمة المرور"
  نفس الحقول بالضبط بموديلات Customer وStore وStaff

  الزيادة ذرّية ($inc) عشان المحاولات المتزامنة كلها تنحسب صح
*/

const MAX_OTP_ATTEMPTS = 5;

const OTP_LOGIN = {
  codeField: "otpCode",
  expiresField: "otpExpiresAt",
  attemptsField: "otpFailedAttempts",
};

const OTP_PASSWORD_RESET = {
  codeField: "passwordResetOtp",
  expiresField: "passwordResetOtpExpire",
  attemptsField: "passwordResetOtpFailedAttempts",
};

/*
  تسجيل محاولة غلط - بيرجّع true لو هالمحاولة استنفدت الحد (والرمز انلغى)
  Model: موديل الحساب (Customer / Store / Staff)
*/
const registerFailedAttempt = async (Model, accountId, kind) => {
  const updated = await Model.findByIdAndUpdate(
    accountId,
    { $inc: { [kind.attemptsField]: 1 } },
    { new: true },
  ).select(`+${kind.attemptsField}`);

  if (!updated || updated[kind.attemptsField] < MAX_OTP_ATTEMPTS) return false;

  await Model.updateOne(
    { _id: accountId },
    {
      $unset: {
        [kind.codeField]: 1,
        [kind.expiresField]: 1,
        [kind.attemptsField]: 1,
      },
    },
  );
  return true;
};

// الرد الموحّد لما الرمز ينلغى بسبب كثرة المحاولات الغلط
const TOO_MANY_ATTEMPTS_RESPONSE = {
  message:
    "تجاوزت عدد المحاولات المسموح بها، تم إلغاء الرمز. الرجاء طلب رمز جديد",
};

module.exports = {
  MAX_OTP_ATTEMPTS,
  OTP_LOGIN,
  OTP_PASSWORD_RESET,
  registerFailedAttempt,
  TOO_MANY_ATTEMPTS_RESPONSE,
};

// user
import React from "react";

/*
  BrandLogo
  ------------------------------------------------------------------
  شعار البراند (September) - مصدر واحد للحقيقة بدل ما يتكرر نص الشعار
  بالهيدر والفوتر وقائمة الموبايل (كان هيك بالتصميم القديم MAISON RÉVA
  وكان لازم يتحدّث بـ3 أماكن لو تغيّر الاسم)

  - variant="dark"  → للخلفيات الفاتحة (الهيدر، قائمة الموبايل)
  - variant="light" → للخلفية العنابية الداكنة (الفوتر)

  ⚠️ حاليًا الشعار بيترسم كنص بخط خطّي (Playball) كبديل مؤقت، لأن ملف
  الشعار الأصلي ما وصلني (بس لقطات شاشة منخفضة الدقة). لما تحط ملفات
  الشعار الحقيقية (يفضّل SVG أو PNG شفاف) بـ src/assets:
    1) استورد الملفين فوق: import logoDark from "../assets/logo-dark.svg";
                             import logoLight from "../assets/logo-light.svg";
    2) حطّهم بدل null بالثابتين تحت
  وبيتبدّل الشعار بكل الموقع بنفس اللحظة بدون ما تلمس أي ملف تاني
*/
const LOGO_DARK_SRC = null;
const LOGO_LIGHT_SRC = null;

const BrandLogo = ({ variant = "dark" }) => {
  const src = variant === "light" ? LOGO_LIGHT_SRC : LOGO_DARK_SRC;

  if (src) {
    return (
      <img
        src={src}
        alt="September"
        className={`brand-logo-img brand-logo-img--${variant}`}
      />
    );
  }

  return (
    <span
      className={`brand-logo brand-logo--${variant}`}
      aria-label="September"
    >
      <span className="brand-logo-word">September</span>
      <span className="brand-logo-tag" aria-hidden="true" />
    </span>
  );
};

export default BrandLogo;

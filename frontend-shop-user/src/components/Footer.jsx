// user
import React from "react";
import { Link } from "react-router-dom";
import { FiPhone, FiMail, FiMapPin } from "react-icons/fi";
import { FaInstagram, FaTwitter, FaFacebookF, FaYoutube } from "react-icons/fa";
import { FOOTER_LINKS } from "../constants/siteNavItems";

/*
  Footer
  ------------------------------------------------------------------
  فوتر الموقع - بيظهر بأسفل كل صفحات الموقع (مركّب بـ MainLayout تحت
  <main> مباشرة، جوّا نفس .site-layout الفليكس عشان يضل بأسفل الشاشة
  دايمًا حتى لو محتوى الصفحة قصير)

  ⚠️ كل البيانات هون (رقم الهاتف، الإيميل، العنوان، روابط السوشال ميديا)
  بيانات مبدئية للشكل بس - حطها صاحب المشروع لاحقًا بالقيم الحقيقية.
  نفس اسم البراند المستخدم أصلاً بالهيدر (MAISON RÉVA) تكرارًا لمصدر
  واحد بالتصميم - لو تغيّر اسم البراند لاحقًا، لازم يتحدّث بمكانين
  (هون وبـ Header.jsx) لأنه نص ثابت مش متغيّر مشترك حاليًا

  روابط "من نحن/الشروط/الخصوصية" جايّة من FOOTER_LINKS
  (constants/siteNavItems.js) - نفس فلسفة HEADER_ICON_LINKS بالضبط،
  مصدر واحد للحقيقة بدل ما تتكرر المسارات جوا الكومبوننت نفسه
*/
const SOCIAL_LINKS = [
  { icon: FaInstagram, url: "https://instagram.com", label: "إنستغرام" },
  { icon: FaTwitter, url: "https://twitter.com", label: "تويتر" },
  { icon: FaFacebookF, url: "https://facebook.com", label: "فيسبوك" },
  { icon: FaYoutube, url: "https://youtube.com", label: "يوتيوب" },
];

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo">
            <span className="site-footer-logo-main">MAISON</span>
            <span className="site-footer-logo-sub">RÉVA</span>
          </Link>
          <p className="site-footer-tagline">
            منصة الأزياء الفاخرة – حيث تلتقي الموضة بالأصالة والشفافية
          </p>

          <div className="site-footer-social">
            {SOCIAL_LINKS.map(({ icon: Icon, url, label }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer-social-btn"
                aria-label={label}
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className="site-footer-contact">
          <h3 className="site-footer-heading">تواصل معنا</h3>

          <a href="tel:+963110000000" className="site-footer-contact-row">
            <span>+963 11 000 0000</span>
            <FiPhone />
          </a>

          <a
            href="mailto:hello@maisonreva.com"
            className="site-footer-contact-row"
          >
            <span>hello@maisonreva.com</span>
            <FiMail />
          </a>

          <span className="site-footer-contact-row">
            <span>دمشق، الجمهورية العربية السورية</span>
            <FiMapPin />
          </span>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p className="site-footer-copyright">
          © {new Date().getFullYear()} Maison Réva. جميع الحقوق محفوظة.
        </p>

        <nav className="site-footer-links">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.path} to={link.path}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;

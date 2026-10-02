// user
import React from "react";
import { Link } from "react-router-dom";
import { FiPhone, FiMail, FiMapPin } from "react-icons/fi";
import { FaInstagram, FaFacebookF } from "react-icons/fa";
import { FOOTER_LINKS, FOOTER_SHOP_LINKS } from "../constants/siteNavItems";
import { useHomeSectionData } from "../hooks/useHomeSectionData";
import BrandLogo from "./BrandLogo";

/*
  Footer
  ------------------------------------------------------------------
  فوتر الموقع - بيظهر بأسفل كل صفحات الموقع (مركّب بـ MainLayout تحت
  <main> مباشرة، جوّا نفس .site-layout الفليكس عشان يضل بأسفل الشاشة
  دايمًا حتى لو محتوى الصفحة قصير)

  التصميم الجديد (خلفية عنابية بدل الداكنة): البراند + نبذة + سوشال، ثم
  قائمة "تسوّق" الموحّدة، ثم "تواصل معنا"، ثم الحقوق. أهم التغييرات عن
  القديم:
  - قائمة "تسوّق" بتجمع بمكان واحد: وصل حديثاً + الأقسام الرئيسية
    (رجالي/نسائي...) + من نحن/الشروط/الخصوصية - بدل الشريط السفلي
    القديم الخاص بالروابط التعريفية بس
  - الأقسام الرئيسية ديناميكية من /shop/categories (نفس بيانات الرئيسية،
    بكاش مشترك وبدون طلب مكرر - شوف useHomeSectionData) فلو الأدمن أضاف
    أو حذف قسم رئيسي بيتحدّث الفوتر لحاله. لو فشل الطلب بتضل باقي
    الروابط ظاهرة عادي
  - السوشال انحصر بإنستغرام + فيسبوك (تويتر ويوتيوب انشالوا بالتصميم)
  - أيقونة صفوف التواصل صارت قبل النص (أقصى اليمين) مش بعده

  ⚠️ كل البيانات هون (رقم الهاتف، الإيميل، روابط السوشال ميديا) بيانات
  مبدئية للشكل بس - حطها صاحب المشروع لاحقًا بالقيم الحقيقية. اسم البراند
  والشعار من BrandLogo المشترك (مصدر واحد)، أما نص الحقوق فثابت هون
*/
const SOCIAL_LINKS = [
  { icon: FaInstagram, url: "https://instagram.com", label: "إنستغرام" },
  { icon: FaFacebookF, url: "https://facebook.com", label: "فيسبوك" },
];

const Footer = () => {
  const { items: categories } = useHomeSectionData(
    "/shop/categories",
    "categories",
  );

  const shopLinks = [
    ...FOOTER_SHOP_LINKS,
    ...categories.map((cat) => ({
      label: cat.name,
      path: `/shop?category=${cat.id}`,
    })),
    ...FOOTER_LINKS,
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <Link to="/" className="site-footer-logo" aria-label="الرئيسية">
          <BrandLogo variant="light" />
        </Link>
        <p className="site-footer-tagline">
          أزياء مستعملة بحالة ممتازة، مفحوصة يدوياً ومعروضة بصدق. من كل قطعة
          نسخة واحدة.
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

      <div className="site-footer-section">
        <h3 className="site-footer-heading">تسوّق</h3>
        <nav className="site-footer-links">
          {shopLinks.map((link) => (
            <Link key={link.path} to={link.path}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="site-footer-section">
        <h3 className="site-footer-heading">تواصل معنا</h3>

        <a href="tel:+963110000000" className="site-footer-contact-row">
          <FiPhone />
          <span dir="ltr">+963 11 000 0000</span>
        </a>

        <a
          href="mailto:hello@maisonreva.com"
          className="site-footer-contact-row"
        >
          <FiMail />
          <span dir="ltr">hello@maisonreva.com</span>
        </a>

        <span className="site-footer-contact-row">
          <FiMapPin />
          <span>حلب، سوريا</span>
        </span>
      </div>

      <div className="site-footer-bottom">
        <p className="site-footer-copyright">
          © {new Date().getFullYear()} سبتمبر September. جميع الحقوق محفوظة.
        </p>
        <p className="site-footer-note">الأسعار بالليرة السورية</p>
      </div>
    </footer>
  );
};

export default Footer;

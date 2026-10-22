// user
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiImage,
  FiBell,
  FiShield,
  FiCamera,
  FiLock,
  FiRotateCcw,
  FiPackage,
  FiSearch,
  FiFileText,
  FiCheckCircle,
  FiShoppingBag,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { getImageUrl } from "../config/api";
import ProductCard from "../components/ProductCard";
import { useHomeSectionData } from "../hooks/useHomeSectionData";
import heroImage from "../assets/image1.jpg";
import notifyImage from "../assets/image2.jpg";
import storyImage from "../assets/image3.jpg";
import image4 from "../assets/image4.jpg";
import image5 from "../assets/image5.jpg";
import image6 from "../assets/image6.jpg";
import image7 from "../assets/image7.jpg";
import image8 from "../assets/image8.jpg";
import image9 from "../assets/image9.jpg";
import image10 from "../assets/image10.jpg";
import image11 from "../assets/image11.jpg";

/*
  Home - الصفحة الرئيسية (التصميم الجديد - ملف واحد)
  ------------------------------------------------------------------
  كانت الرئيسية موزّعة على 12 كومبوننت بـ components/home/ - هلأ كل
  الأقسام هون بملف واحد (الكومبوننتات الصغيرة المساعدة جوّا نفس الملف).
  الأقسام بالترتيب من فوق لتحت:

  1) الـ Hero: صورة + شارة "١ من ١" + العنوان + زرين
  2) بطاقة الثقة (2×2): فحص يدوي / صور حقيقية / دفع آمن / إرجاع
  3) "جديدنا هذا الأسبوع" - بيانات حقيقية (/shop/new-arrivals)
  4) "اختر ما تبحث عنه": الأقسام الرئيسية كصفوف (/shop/categories)
     + شريط أفقي لأنواع القطع (/shop/piece-types)
  5) بطاقة "كل قطعة متوفرة مرة واحدة فقط" + زر التنبيهات
  6) "ماذا يحدث للقطعة قبل أن تصلك" - خط زمني عمودي من 6 خطوات
  7) "قصتنا" + قيم + زر "اعرف أكثر عنا" + بطاقة "قيّم مشترياتك"

  أشياء انحذفت من التصميم القديم (بقرار التصميم الجديد): شريط شارات
  الثقة فوق الـ Hero، شريط الإحصائيات، "لماذا Maison Rêva"، "براندات
  فاخرة"، "آراء عملائنا" (حلّت محلها بطاقة "قيّم مشترياتك")، وزر
  "اعرف أكثر عن معايير الجودة" (كان بلا وظيفة أصلاً)

  - الأقسام يلي بتجيب بيانات (جديدنا/الأقسام/أنواع القطع) ما بتترسم لو
    فاضية أو لسا بتحمّل - نفس فلسفة الكومبوننتات القديمة بالضبط، وكلها
    بكاش مشترك (homeSectionCache عبر useHomeSectionData) عشان القسم ما
    يختفي ويرجع يظهر (وميض) كل مرة الرئيسية تتبنى من جديد
  - باقي الأقسام شكلية بالكامل (محتوى ثابت)
*/

/* ==================== بيانات ثابتة ==================== */

const TRUST_ITEMS = [
  { icon: FiShield, title: "فحص يدوي", text: "لكل قطعة قبل نشرها" },
  { icon: FiCamera, title: "صور حقيقية ١٠٠٪", text: "نصوّر القطعة كما هي" },
  { icon: FiLock, title: "دفع آمن ومشفّر", text: "بياناتك محمية" },
  { icon: FiRotateCcw, title: "إرجاع خلال ٣ أيام", text: "إن لم تطابق الوصف" },
];

/*
  صور أنواع القطع (الشريط الأفقي تحت الأقسام الرئيسية)
  فلتر "نوع المنتج" قيم نصية بس (مفيش حقل صورة بالباك إند أصلاً - شوف
  shop.controller.js → getPieceTypes) فالصور هون خريطة محلية بالفرونت
  (قيمة الفلتر الداخلية → صورة) - لازم تتعبّى يدويًا. لو ضفت قيمة جديدة
  من لوحة التحكم لاحقًا ضيف سطر إلها هون. أي قيمة بدون صورة بتترسم
  بأيقونة بديلة (FiImage) تلقائيًا بدل ما تكسر التصميم
*/
const PIECE_TYPE_IMAGES = {
  فستان: image4,
  جاكيت: image10,
  قميص: image11,
  بلايزر: image8,
  بلوزة: image10,
  بنطال: image5,
  تنورة: image4,
  كارديجان: image4,
  معطف: image9,
  حذاء: image6,
  حقيبة: image7,
  إكسسوار: image6,
};

const JOURNEY_STEPS = [
  {
    icon: FiPackage,
    label: "الخطوة ١",
    title: "الاستلام",
    text: "نسجّل الماركة والمقاس والحالة لكل قطعة وصلتنا.",
  },
  {
    icon: FiSearch,
    label: "الخطوة ٢",
    title: "الفحص الدقيق",
    text: "نفحص القماش والخياطة والسحّابات والأزرار يدوياً.",
  },
  {
    icon: FiFileText,
    label: "الخطوة ٣",
    title: "توثيق العيوب",
    text: "أي أثر استخدام نصوّره ونكتبه في وصف القطعة.",
  },
  {
    icon: HiSparkles,
    label: "الخطوة ٤",
    title: "التنظيف",
    text: "تنظيف احترافي للقطعة قبل تصويرها وشحنها.",
  },
  {
    icon: FiCheckCircle,
    label: "الخطوة ٥",
    title: "الاعتماد النهائي",
    text: "مراجعة أخيرة للتأكد أن القطعة تطابق معاييرنا.",
  },
  {
    icon: FiShoppingBag,
    label: "الخطوة ٦",
    title: "النشر والبيع",
    text: "نصوّرها بأنفسنا وننشرها بسعر واضح ووصف صادق.",
  },
];

const STORY_VALUES = [
  { icon: FiShield, label: "الجودة" },
  { icon: FiCheckCircle, label: "الأصالة" },
  { icon: FiCamera, label: "الشفافية" },
];

/* ==================== مساعدات ==================== */

/*
  وصف سطر الصف بقسم "اختر ما تبحث عنه":
  - لو الـ API رجّع الفئات الفرعية للقسم (subCategories) بنعرض أسماءها
    مفصولة بفواصل، وآخر وحدة بـ"و" (مثل: جاكيتات، قمصان، بناطيل وأحذية)
  - غير هيك بنعرض عدّاد القطع (productsCount) - نفس البيانات يلي كان
    بيعرضها كرت القسم القديم، فما في حالة بتطلع فاضية
*/
const joinArabicList = (items) =>
  items.length <= 1
    ? items[0] || ""
    : `${items.slice(0, -1).join("، ")} و${items[items.length - 1]}`;

const describeCategory = (cat) => {
  const names = (cat.subCategories || [])
    .map((sub) => sub.name)
    .filter(Boolean)
    .slice(0, 4);
  return names.length > 0
    ? joinArabicList(names)
    : `${cat.productsCount ?? 0} قطعة`;
};

// "السطر المميّز": خط ذهبي قصير + نص صغير ذهبي، فوق عنوان كل قسم
const Eyebrow = ({ children }) => (
  <div className="home-eyebrow">{children}</div>
);

const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <header className="home-section-header">
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="home-title">{title}</h2>
    {subtitle && <p className="home-subtitle">{subtitle}</p>}
  </header>
);

// رابط "عرض الكل" - النص أول عنصر (يمين) والسهم بعده (يسار) بصفحة RTL
const SectionLink = ({ to, state, children }) => (
  <Link to={to} state={state} className="home-section-link">
    <span>{children}</span>
    <FiArrowLeft />
  </Link>
);

/* ==================== الصفحة ==================== */

const Home = () => {
  const { items: newArrivals, loading: newArrivalsLoading } =
    useHomeSectionData("/shop/new-arrivals", "products");
  const { items: categories, loading: categoriesLoading } = useHomeSectionData(
    "/shop/categories",
    "categories",
  );
  const { items: pieceTypes, loading: pieceTypesLoading } = useHomeSectionData(
    "/shop/piece-types",
    "pieceTypes",
  );

  const showNewArrivals = !newArrivalsLoading && newArrivals.length > 0;
  const showBrowse =
    (!categoriesLoading && categories.length > 0) ||
    (!pieceTypesLoading && pieceTypes.length > 0);

  return (
    <div className="home-page">
      {/* ---------- 1) Hero ---------- */}
      <section className="home-hero">
        <div className="home-hero-media">
          <img src={heroImage} alt="" className="home-hero-image" />
          <div className="home-hero-badge">
            <span className="home-hero-badge-main">١ من ١</span>
            <span className="home-hero-badge-sub">
              قطعة واحدة
              <br />
              من كل تصميم
            </span>
          </div>
        </div>

        <Eyebrow>أزياء مستعملة مختارة بعناية</Eyebrow>

        <h1 className="home-hero-title">
          قطع مميزة بحالة ممتازة،{" "}
          <span className="home-hero-title-accent">
            وبسعر أقل من سعرها الأصلي
          </span>
        </h1>

        <p className="home-text">
          نستلم كل قطعة ونفحصها يدوياً، نصوّرها بأنفسنا ونذكر أي أثر استخدام
          فيها، ثم ننظّفها قبل الشحن. وكل قطعة متوفرة مرة واحدة فقط، فما يعجبك
          اليوم قد لا يبقى غداً.
        </p>

        {/*
          الزر الأول بيفتح المتجر مع فلتر "وصل حديثًا" (isNew=1)، والتاني
          بيفتح المتجر بس مع فتح درج الفلاتر تلقائيًا على قسم "الفئة"
          (state.openSection - تمريرة عابرة مش فلتر محفوظ بالرابط، شوف
          تعليق Shop.jsx) - نفس وظيفة زرّي الـ Hero القديم بالضبط
        */}
        <div className="home-hero-actions">
          <Link to="/shop?isNew=1" className="home-btn home-btn--filled">
            <span>تسوّق ما وصل حديثاً</span>
            <FiArrowLeft />
          </Link>
          <Link
            to="/shop"
            state={{ openSection: "category" }}
            className="home-btn home-btn--outline"
          >
            تصفّح حسب الفئة
          </Link>
        </div>
      </section>

      {/* ---------- 2) بطاقة الثقة 2×2 ---------- */}
      <section className="home-trust">
        {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
          <div className="home-trust-cell" key={title}>
            <span className="home-trust-icon">
              <Icon />
            </span>
            <h3 className="home-trust-title">{title}</h3>
            <p className="home-trust-text">{text}</p>
          </div>
        ))}
      </section>

      {/* ---------- 3) جديدنا هذا الأسبوع ---------- */}
      {showNewArrivals && (
        <section className="home-section">
          <SectionHeader
            eyebrow="وصل حديثاً"
            title="جديدنا هذا الأسبوع"
            subtitle="من كل قطعة نسخة واحدة. إذا أعجبتك، أضفها إلى سلتك قبل غيرك."
          />

          <SectionLink to="/shop?isNew=1">عرض كل الجديد</SectionLink>

          <div className="home-products-grid">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- 4) اختر ما تبحث عنه ---------- */}
      {showBrowse && (
        <section className="home-section">
          <SectionHeader eyebrow="تسوّق حسب الفئة" title="اختر ما تبحث عنه" />

          <SectionLink to="/shop">كل القطع</SectionLink>

          {categories.length > 0 && (
            <div className="home-category-list">
              {categories.map((cat) => (
                <Link
                  to={`/shop?category=${cat.id}`}
                  key={cat.id}
                  className="home-category-row"
                >
                  <span className="home-category-avatar">
                    {cat.image ? (
                      <img src={getImageUrl(cat.image)} alt={cat.name} />
                    ) : (
                      <FiImage />
                    )}
                  </span>

                  <span className="home-category-text">
                    <span className="home-category-name">{cat.name}</span>
                    <span className="home-category-desc">
                      {describeCategory(cat)}
                    </span>
                  </span>

                  <FiChevronLeft className="home-category-chevron" />
                </Link>
              ))}
            </div>
          )}

          {pieceTypes.length > 0 && (
            <div className="home-piece-scroller">
              {pieceTypes.map((type) => {
                const image = PIECE_TYPE_IMAGES[type.value];
                return (
                  <Link
                    to={`/shop?piece_type=${encodeURIComponent(type.value)}`}
                    key={type.value}
                    className="home-piece-card"
                  >
                    <span className="home-piece-media">
                      {image ? (
                        <img src={image} alt={type.label} />
                      ) : (
                        <FiImage />
                      )}
                    </span>
                    <span className="home-piece-overlay" />
                    <span className="home-piece-name">{type.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------- 5) بطاقة التنبيهات ---------- */}
      <section className="home-section">
        <div className="home-notify">
          <img src={notifyImage} alt="" className="home-notify-image" />
          <div className="home-notify-body">
            <h2 className="home-notify-title">كل قطعة متوفرة مرة واحدة فقط</h2>
            <p className="home-notify-text">
              لا نعيد تخزين أي قطعة. حين تُباع، تختفي من المتجر. فعّل التنبيهات
              لتعرف أول ما تصل قطع جديدة، قبل أن يسبقك غيرك إليها.
            </p>
            {/* صفحة الإشعارات (محمية - الزائر بيتحوّل لتسجيل الدخول وبيرجع
                لها فورًا بعد الدخول، شوف ProtectedRoute) */}
            <Link
              to="/notifications"
              className="home-btn home-btn--filled home-btn--auto"
            >
              <span>فعّل التنبيهات</span>
              <FiBell />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 6) رحلة القطعة (خط زمني) ---------- */}
      <section className="home-section">
        <SectionHeader
          eyebrow="شفافية كاملة"
          title="ماذا يحدث للقطعة قبل أن تصلك"
          subtitle="ست خطوات تمرّ بها كل قطعة. إذا تعثّرت في واحدة منها، لا تُعرض للبيع."
        />

        <ol className="home-timeline">
          {JOURNEY_STEPS.map(({ icon: Icon, label, title, text }, index) => (
            <li className="home-timeline-step" key={title}>
              <div className="home-timeline-rail">
                <span className="home-timeline-icon">
                  <Icon />
                </span>
                {index < JOURNEY_STEPS.length - 1 && (
                  <span className="home-timeline-line" />
                )}
              </div>

              <div className="home-timeline-body">
                <span className="home-timeline-label">{label}</span>
                <h3 className="home-timeline-title">{title}</h3>
                <p className="home-timeline-text">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 7) قصتنا + قيّم مشترياتك ---------- */}
      <section className="home-section home-story">
        <div className="home-story-image-wrap">
          <img src={storyImage} alt="" className="home-story-image" />
        </div>

        <Eyebrow>قصتنا</Eyebrow>
        <h2 className="home-title">لأن القطعة الجيدة تستحق حياة ثانية</h2>
        <p className="home-text">
          بدأ متجر سبتمبر في حلب بفكرة بسيطة: الأزياء الجيدة لا تفقد قيمتها بعد
          أول استخدام. نختار قطعاً بحالة ممتازة، ونعرضها بصدق كامل عن حالتها،
          لتحصل على الجودة التي تحبها بسعر أعقل، ونمنح قطعة جميلة فرصة أخرى بدل
          أن تُهمل في خزانة.
        </p>

        <div className="home-values">
          {STORY_VALUES.map(({ icon: Icon, label }) => (
            <span className="home-value-chip" key={label}>
              <Icon />
              <span>{label}</span>
            </span>
          ))}
        </div>

        {/* "اعرف أكثر عنا" بيودي لصفحة /about حاليًا (لسه مش مبنية -
            Placeholder زي باقي روابط الموقع لحد ما نبنيها فعليًا) */}
        <Link to="/about" className="home-btn home-btn--outline">
          اعرف أكثر عنا
        </Link>

        {/* نص التصميم بيقول "قيّم قطعتك من صفحة طلباتك" فالزر بيودي لـ /orders
            (محمية - الزائر بيتحوّل لتسجيل الدخول). ⚠️ ملاحظة: التقييم
            الفعلي حاليًا بيتم من صفحة المنتج (ProductDetails → pd-rate-
            section) ومفيش زر تقييم بصفحات الطلبات بعد - شوف ملاحظات التسليم */}
        <div className="home-rate-card">
          <div className="home-rate-stars" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <FaStar key={i} />
            ))}
          </div>
          <h2 className="home-rate-title">اشتريت من سبتمبر؟</h2>
          <p className="home-rate-text">
            قيّم قطعتك من صفحة طلباتك. رأيك الصادق يساعد غيرك على الاختيار،
            ويساعدنا على التحسين.
          </p>
          <Link to="/orders" className="home-btn home-btn--filled">
            قيّم مشترياتك
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

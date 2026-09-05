// user

/*
  LuxuryBrands
  - قسم "براندات فاخرة" بالصفحة الرئيسية - شكلي بالكامل، محتوى ثابت
  - أسماء البراندات بس (نص عادي)، من غير أيقونات أو صور شعارات - مرصوصة
    بسحابة نص متمركزة (flex-wrap) بترتيب طبيعي، بالضبط زي التصميم
  - أسماء البراندات لاتينية بطبيعتها، فالحاوية معزولة بـ direction: ltr
    عشان تترتب من الشمال لليمين صح (نفس أسلوب TrustBadges بالضبط) -
    بدون هاي الخطوة كانت رح تترتب بالعكس تبعًا لاتجاه الصفحة RTL
  - الالتفاف على الأسطر طبيعي (زي أي نص عادي) - ما في تقسيم يدوي
    لصفوف، لأن التصميم نفسه شكله ناتج عن التفاف طبيعي حسب طول كل اسم
*/
const BRANDS = [
  "Dior",
  "Gucci",
  "Valentino",
  "Louis Vuitton",
  "Chanel",
  "Versace",
  "Hermès",
  "Prada",
  "Fendi",
  "Burberry",
  "Armani",
  "Balenciaga",
];

const LuxuryBrands = () => {
  return (
    <section className="brands-section">
      <div className="brands-header">
        <span className="brands-overline">نتعامل مع الأفضل</span>
        <h2 className="brands-title">براندات فاخرة</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>

      <div className="brands-cloud" dir="ltr">
        {BRANDS.map((brand) => (
          <span className="brands-item" key={brand}>
            {brand}
          </span>
        ))}
      </div>
    </section>
  );
};

export default LuxuryBrands;

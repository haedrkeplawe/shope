// user
import {
  FiPackage,
  FiSearch,
  FiFileText,
  FiCheckCircle,
  FiShoppingBag,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

/*
  PieceJourney
  - قسم "رحلة كل قطعة" بالصفحة الرئيسية - شكلي بالكامل، محتوى ثابت

  - بناء الشكل المتعرّج (Zigzag): Grid بـ 3 أعمدة [يمين | سهم أفقي | يسار]
    كل عنصر (خطوة/سهم) بيتحدد مكانه بشكل صريح جدًا (gridColumn + gridRow)
    بدل ما نعتمد على ترتيب DOM + قلب اتجاه Flex - عشان نضمن ١٠٠٪ إن
    الترتيب والاتجاه مضبوطين تمامًا زي التصميم بغض النظر عن أي تفاصيل
    RTL ضمنية، خصوصًا إن الاتجاه بيتبدّل كل صف:

    الصف 1: [يمين] 1 استلام المنتج   ←(سهم لليسار)   [يسار] 2 الفحص الدقيق
                                                              ↓ (سهم تحت اليسار)
    الصف 2: [يمين] 4 التنظيف         →(سهم لليمين)    [يسار] 3 توثيق العيوب
             ↓ (سهم تحت اليمين)
    الصف 3: [يمين] 5 الاعتماد النهائي ←(سهم لليسار)    [يسار] 6 النشر والبيع

  - الأسهم الأفقية معزولة بـ direction: ltr (زي أسلوب TrustBadges بالضبط)
    عشان نتحكم يدويًا بمكان رأس السهم (يمين/يسار) من غير ما نتوه بمنطق
    RTL الضمني للصفحة - هون بالذات الدقة مهمة جدًا فمفيش مجال للتخمين
*/
const STEPS = [
  { n: 1, icon: FiPackage, title: "استلام المنتج", col: 1, row: 1 },
  { n: 2, icon: FiSearch, title: "الفحص الدقيق", col: 3, row: 1 },
  { n: 3, icon: FiFileText, title: "توثيق العيوب", col: 3, row: 3 },
  { n: 4, icon: HiSparkles, title: "التنظيف", col: 1, row: 3 },
  { n: 5, icon: FiCheckCircle, title: "الاعتماد النهائي", col: 1, row: 5 },
  { n: 6, icon: FiShoppingBag, title: "النشر والبيع", col: 3, row: 5 },
];

// الأسهم الأفقية - بين خطوتين بنفس الصف، الاتجاه بيتبدّل كل صف
const H_ARROWS = [
  { row: 1, direction: "left" },
  { row: 3, direction: "right" },
  { row: 5, direction: "left" },
];

// الأسهم العمودية - بتربط آخر خطوة بصف بأول خطوة بالصف التالي
const V_ARROWS = [
  { gridRow: 2, col: 3 }, // تحت "الفحص الدقيق" (عمود اليسار)
  { gridRow: 4, col: 1 }, // تحت "التنظيف" (عمود اليمين)
];

const StepItem = ({ n, icon: Icon, title, col, row }) => (
  <div className="journey-step" style={{ gridColumn: col, gridRow: row }}>
    <span className="journey-step-icon">
      <Icon />
    </span>
    <span className="journey-step-label">الخطوة {n}</span>
    <span className="journey-step-title">{title}</span>
  </div>
);

const HArrow = ({ row, direction }) => (
  <div className="journey-h-arrow" style={{ gridColumn: 2, gridRow: row }}>
    {direction === "left" && <FiChevronLeft className="journey-h-arrow-head" />}
    <span className="journey-h-arrow-line" />
    {direction === "right" && (
      <FiChevronRight className="journey-h-arrow-head" />
    )}
  </div>
);

const VArrow = ({ gridRow, col }) => (
  <div className="journey-v-arrow" style={{ gridColumn: col, gridRow }}>
    <span className="journey-v-arrow-line" />
    <FiChevronDown className="journey-v-arrow-head" />
  </div>
);

const PieceJourney = () => {
  return (
    <section className="journey-section">
      <div className="brands-header">
        <span className="brands-overline">شفافية كاملة</span>
        <h2 className="brands-title">رحلة كل قطعة</h2>
        <div className="brands-divider">
          <span className="brands-divider-dot" />
        </div>
      </div>
      <div className="journey-grid">
        {STEPS.map((step) => (
          <StepItem key={step.n} {...step} />
        ))}
        {H_ARROWS.map((arrow) => (
          <HArrow key={`h-${arrow.row}`} {...arrow} />
        ))}
        {V_ARROWS.map((arrow) => (
          <VArrow key={`v-${arrow.gridRow}`} {...arrow} />
        ))}
      </div>
      <button className="journey">اعرف أكثر عن معايير الجودة</button>
    </section>
  );
};

export default PieceJourney;

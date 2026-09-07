// user
import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

/*
  Accordion
  - قسم قابل للطي/الفتح، معاد استخدامه لأربع أقسام بصفحة تفاصيل المنتج
    (العناية، الوصف، الشحن والإرجاع، تفاصيل القماش) بدل ما نكرر نفس منطق
    الفتح/الإغلاق أربع مرات
  - icon: أيقونة اختيارية جنب العنوان (نفس روح التصميم يلي حط أيقونة صغيرة
    لكل قسم)
  - defaultOpen: أول قسم بيفضل مفتوح افتراضيًا لو حبينا (اختياري)
*/
const Accordion = ({ title, icon: Icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`pd-accordion${isOpen ? " pd-accordion--open" : ""}`}>
      <button
        type="button"
        className="pd-accordion-header"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="pd-accordion-title">
          {Icon && <Icon className="pd-accordion-icon" />}
          {title}
        </span>
        <FiChevronDown className="pd-accordion-chevron" />
      </button>

      {isOpen && <div className="pd-accordion-body">{children}</div>}
    </div>
  );
};

export default Accordion;

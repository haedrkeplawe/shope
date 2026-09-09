import React from "react";
import { FiChevronRight, FiChevronLeft } from "react-icons/fi";

/*
  Pagination
  - عنصر تقسيم صفحات عام قابل لإعادة الاستخدام (الطلبات، العملاء...)
  - بيعرض بحد أقصى 5 أرقام صفحات حول الصفحة الحالية + طرفين ثابتين
    (أول/آخر صفحة) لو بعيدين، مع "..." بالنص لو في فجوة
  - RTL: زر "السابق" (يرجع للخلف بالترقيم) يمين، "التالي" شمال - نفس
    اتجاه القراءة بالعربي
*/
const Pagination = ({ page, totalPages, onChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-arrow"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="الصفحة السابقة"
      >
        <FiChevronRight />
      </button>

      {start > 1 && (
        <>
          <button type="button" onClick={() => onChange(1)}>
            1
          </button>
          {start > 2 && <span className="pagination-ellipsis">...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={p === page ? "pagination-btn--active" : ""}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="pagination-ellipsis">...</span>
          )}
          <button type="button" onClick={() => onChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        className="pagination-arrow"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="الصفحة التالية"
      >
        <FiChevronLeft />
      </button>
    </div>
  );
};

export default Pagination;

import React, { useEffect, useMemo, useState } from "react";
import { FiX, FiSearch, FiUser } from "react-icons/fi";
import { API_URL } from "../config/api";

/*
  CustomerPickerModal
  - نافذة منبثقة لاختيار زبائن محددين (Multi-select) لكوبون من نوع
    "زبائن محددون" - بحث + قائمة قابلة للتحديد بعلامات ✓
  - بتستخدم GET /api/coupons/customer-options?search= (بحث بالاسم أو
    الهاتف، أقصى 30 نتيجة) - نفس فلسفة ProductPickerModal بالضبط
  - selectedCustomers: [{ id, fullName, phone }] - عشان نقدر نعرض أسماء
    الزبائن المختارين حتى لو مش موجودين بنتيجة البحث الحالية
  - بتعيد استخدام أنماط "product-picker-*" الموجودة أصلاً بـ deals.css
    (نافذة اختيار عامة بنفس الشكل بالضبط) بدل ما نكرر نفس الـ CSS
*/
const CustomerPickerModal = ({
  isOpen,
  onClose,
  selectedCustomers,
  onConfirm,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState({});

  // نبني الماب من الزبائن المختارين سلفًا كل ما تفتح النافذة
  useEffect(() => {
    if (!isOpen) return;
    const map = {};
    selectedCustomers.forEach((c) => (map[c.id] = c));
    setSelectedMap(map);
  }, [isOpen, selectedCustomers]);

  // بحث مع Debounce بسيط عشان ما نضرب الـ API مع كل حرف
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/coupons/customer-options?search=${encodeURIComponent(
            search,
          )}`,
          { credentials: "include" },
        );
        const result = await res.json();
        if (res.ok) setResults(result.customers || []);
      } catch (error) {
        // تجاهل - القائمة هتضل فاضية والأدمن يقدر يعيد المحاولة
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const selectedCount = useMemo(
    () => Object.keys(selectedMap).length,
    [selectedMap],
  );

  if (!isOpen) return null;

  const toggleCustomer = (customer) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[customer.id]) {
        delete next[customer.id];
      } else {
        next[customer.id] = customer;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Object.values(selectedMap));
    onClose();
  };

  return (
    <div className="product-picker-overlay" onClick={onClose}>
      <div
        className="product-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="product-picker-header">
          <h3>اختيار الزبائن</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="product-picker-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="product-picker-list">
          {loading && <p className="product-picker-hint">جاري البحث...</p>}

          {!loading && results.length === 0 && (
            <p className="product-picker-hint">لا توجد نتائج</p>
          )}

          {results.map((customer) => (
            <label key={customer.id} className="product-picker-item">
              <input
                type="checkbox"
                checked={Boolean(selectedMap[customer.id])}
                onChange={() => toggleCustomer(customer)}
              />
              <div className="product-picker-item-image">
                <FiUser />
              </div>
              <div className="product-picker-item-info">
                <span className="product-picker-item-name">
                  {customer.fullName}
                </span>
                <span className="product-picker-item-sku">
                  {customer.phone}
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="product-picker-footer">
          <span>{selectedCount} زبون مختار</span>
          <div className="product-picker-footer-actions">
            <button
              type="button"
              className="product-picker-cancel"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="product-picker-confirm"
              onClick={handleConfirm}
            >
              تأكيد الاختيار
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPickerModal;

import React, { useEffect, useMemo, useState } from "react";
import { FiX, FiSearch, FiImage } from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";

/*
  ProductPickerModal
  - نافذة منبثقة لاختيار منتجات محددة (Multi-select) لعرض من نوع
    "منتجات محددة" - بحث + قائمة قابلة للتحديد بعلامات ✓
  - بتستخدم GET /api/offers/product-options?search= (بحث بالاسم، أقصى 30 نتيجة)
  - selectedProducts: [{ id, name, sku, price, image }] - عشان نقدر نعرض
    أسماء المنتجات المختارة حتى لو مش موجودة بنتيجة البحث الحالية
*/
const ProductPickerModal = ({
  isOpen,
  onClose,
  selectedProducts,
  onConfirm,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState({});

  // نبني الماب من المنتجات المختارة سلفًا كل ما تفتح النافذة
  useEffect(() => {
    if (!isOpen) return;
    const map = {};
    selectedProducts.forEach((p) => (map[p.id] = p));
    setSelectedMap(map);
  }, [isOpen, selectedProducts]);

  // بحث مع Debounce بسيط عشان ما نضرب الـ API مع كل حرف
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/offers/product-options?search=${encodeURIComponent(
            search,
          )}`,
          { credentials: "include" },
        );
        const result = await res.json();
        if (res.ok) setResults(result.products || []);
      } catch (error) {
        // تجاهل - القائمة هتضل فاضية والمستخدم يقدر يعيد المحاولة
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

  const toggleProduct = (product) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = product;
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
          <h3>اختيار المنتجات</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="product-picker-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث باسم المنتج..."
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

          {results.map((product) => (
            <label key={product.id} className="product-picker-item">
              <input
                type="checkbox"
                checked={Boolean(selectedMap[product.id])}
                onChange={() => toggleProduct(product)}
              />
              <div className="product-picker-item-image">
                {product.image ? (
                  <img src={getImageUrl(product.image)} alt={product.name} />
                ) : (
                  <FiImage />
                )}
              </div>
              <div className="product-picker-item-info">
                <span className="product-picker-item-name">{product.name}</span>
                <span className="product-picker-item-sku">
                  {product.sku} — {product.price} ل.س
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="product-picker-footer">
          <span>{selectedCount} منتج مختار</span>
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

export default ProductPickerModal;

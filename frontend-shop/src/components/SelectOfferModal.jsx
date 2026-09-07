import React, { useState } from "react";
import { FiX, FiTag, FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";
import { API_URL } from "../config/api";

/*
  SelectOfferModal
  ------------------------------------------------------------------
  بتظهر لما الأدمن يجي لصفحة "العروض" قادمًا من صفحة "المفضلة" (زر
  "إنشاء عرض" على منتج معيّن) - بتعرض العروض الموجودة من نوع "منتجات
  محددة" بس (النوع الوحيد اللي منطقي نضيف له منتج مفرد)، فيختار الأدمن
  عرض جاهز يضاف له المنتج مباشرة، أو ينشئ عرض جديد من الصفر مع تجهيز
  المنتج مسبقًا بالفورم (onCreateNew)

  ⚠️ بتعيد استخدام نفس أنماط CSS الخاصة بـ "اختيار المنتجات"
  (product-picker-* من deals.css) بدل ما تنشئ ستايل جديد بالكامل - نفس
  الشكل البصري تمامًا، بس بمنطق اختيار مفرد (زر) بدل تحديد متعدد (checkbox)
*/
const SelectOfferModal = ({
  product,
  offers,
  onClose,
  onAdded,
  onCreateNew,
}) => {
  const [addingId, setAddingId] = useState(null);

  if (!product) return null;

  const handleAdd = async (offer) => {
    setAddingId(offer.id);
    try {
      const res = await fetch(`${API_URL}/offers/${offer.id}/add-product`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: product.id }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إضافة المنتج للعرض");
        return;
      }

      toast.success(result.message);
      onAdded();
      onClose();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="product-picker-overlay" onClick={onClose}>
      <div
        className="product-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="product-picker-header">
          <h3>إضافة "{product.name}" إلى عرض</h3>
          <button type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="product-picker-list">
          {offers.length === 0 && (
            <p className="product-picker-hint">
              لا يوجد عرض حالي من نوع "منتجات محددة" - أنشئ عرضًا جديدًا لهذا
              المنتج
            </p>
          )}

          {offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className="product-picker-item select-offer-item"
              disabled={addingId === offer.id}
              onClick={() => handleAdd(offer)}
            >
              <div className="product-picker-item-image select-offer-item-icon">
                <FiTag />
              </div>
              <div className="product-picker-item-info">
                <span className="product-picker-item-name">{offer.title}</span>
                <span className="product-picker-item-sku">
                  خصم {offer.discountPercent}% — {offer.productIds?.length || 0}{" "}
                  منتج حاليًا
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="product-picker-footer">
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
            onClick={onCreateNew}
          >
            <FiPlus />
            إنشاء عرض جديد بدلاً من ذلك
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectOfferModal;

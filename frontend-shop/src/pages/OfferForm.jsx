import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiTag, FiTarget, FiEye } from "react-icons/fi";
import { API_URL } from "../config/api";
import { OFFER_TARGET_OPTIONS } from "../utils/offerStatus";
import ProductPickerModal from "../components/ProductPickerModal";

/*
  OfferForm
  - فورم واحد مشترك لإنشاء عرض جديد وتعديل عرض موجود
  - targetType بيحدد أي حقول إضافية تظهر (فئة / منتجات محددة)
*/
const OfferForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]); // [{id,name,sku,price,image}]
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // جلب كل الفئات (رئيسية + فرعية) عشان خيار "فئة محددة"
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/categories/overview`, {
          credentials: "include",
        });
        const result = await res.json();
        if (!res.ok) return;

        const options = [
          ...result.mainCategories.map((c) => ({ id: c.id, label: c.name })),
          ...result.subCategories.map((c) => ({
            id: c.id,
            label: `${c.parentName} > ${c.name}`,
          })),
        ];
        setCategoryOptions(options);
      } catch (error) {
        // تجاهل - خيار الفئة هيضل فاضي والأدمن يقدر يعيد المحاولة بإعادة فتح الصفحة
      }
    };
    fetchCategories();
  }, []);

  // لو تعديل، هات بيانات العرض الحالي
  useEffect(() => {
    if (!isEdit) return;

    const fetchOffer = async () => {
      try {
        const res = await fetch(`${API_URL}/offers/${id}`, {
          credentials: "include",
        });
        const result = await res.json();

        if (!res.ok) {
          toast.error(result.message || "تعذر تحميل بيانات العرض");
          navigate("/deals");
          return;
        }

        const offer = result.offer;
        setTitle(offer.title);
        setDiscountPercent(offer.discountPercent);
        setStartDate(offer.startDate?.slice(0, 10) || "");
        setEndDate(offer.endDate?.slice(0, 10) || "");
        setTargetType(offer.targetType);
        setCategoryId(offer.categoryId || "");

        // لو منتجات محددة، هات تفاصيلها المختصرة عشان تتعرض كتشيبس
        if (
          offer.targetType === "specific_products" &&
          offer.productIds?.length
        ) {
          const productsRes = await fetch(`${API_URL}/offers/product-options`, {
            credentials: "include",
          });
          const productsResult = await productsRes.json();
          const idsSet = new Set(offer.productIds.map(String));
          const preSelected = (productsResult.products || []).filter((p) =>
            idsSet.has(String(p.id)),
          );
          setSelectedProducts(preSelected);
        }
      } catch (error) {
        toast.error("تعذر الاتصال بالسيرفر");
      } finally {
        setFetching(false);
      }
    };

    fetchOffer();
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("اسم العرض مطلوب");
      return;
    }
    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      toast.error("نسبة الخصم لازم تكون بين 1 و100");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("تاريخ البداية والانتهاء مطلوبين");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("تاريخ الانتهاء لازم يكون بعد تاريخ البداية");
      return;
    }
    if (targetType === "category" && !categoryId) {
      toast.error("لازم تختار الفئة");
      return;
    }
    if (targetType === "specific_products" && selectedProducts.length === 0) {
      toast.error("لازم تختار منتج واحد على الأقل");
      return;
    }

    const payload = {
      title,
      discountPercent: Number(discountPercent),
      startDate,
      endDate,
      targetType,
      categoryId: targetType === "category" ? categoryId : null,
      productIds:
        targetType === "specific_products"
          ? selectedProducts.map((p) => p.id)
          : [],
    };

    setLoading(true);
    try {
      const url = isEdit ? `${API_URL}/offers/${id}` : `${API_URL}/offers`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "حدث خطأ أثناء الحفظ");
        return;
      }

      toast.success(result.message || "تم الحفظ بنجاح");
      navigate("/deals");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  return (
    <div className="offer-form-page">
      <div className="offer-form-header">
        <h1 className="offer-form-title">
          {isEdit ? `تعديل العرض: ${title}` : "إنشاء عرض جديد"}
        </h1>
        <p className="offer-form-subtitle">
          {isEdit ? "تعديل بيانات العرض" : "إنشاء عرض أو تخفيض جديد للمتجر"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="offer-form-grid">
        {/* العمود الجانبي */}
        <div className="offer-form-side">
          <div className="offer-form-card">
            <h3 className="offer-form-card-title">
              <FiEye />
              معاينة
            </h3>
            <div className="offer-preview-card">
              <span className="offer-preview-badge">نسبة مئوية</span>
              <span className="offer-preview-name">{title || "اسم العرض"}</span>
              <span className="offer-preview-percent">
                {discountPercent || 0}%
              </span>
              <span className="offer-preview-dates">
                {startDate || "—"} — {endDate || "—"}
              </span>
            </div>
          </div>

          <div className="offer-form-card">
            <h3 className="offer-form-card-title">
              <FiTarget />
              تطبيق العرض على
            </h3>
            <div className="offer-target-options">
              {OFFER_TARGET_OPTIONS.map((opt) => (
                <label key={opt.value} className="offer-target-option">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === opt.value}
                    onChange={() => setTargetType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {targetType === "category" && (
              <div className="offer-form-group">
                <label>الفئة</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">اختر فئة...</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "specific_products" && (
              <div className="offer-form-group">
                <button
                  type="button"
                  className="offer-pick-products-btn"
                  onClick={() => setPickerOpen(true)}
                >
                  اختيار المنتجات ({selectedProducts.length})
                </button>
                {selectedProducts.length > 0 && (
                  <div className="offer-selected-products">
                    {selectedProducts.map((p) => (
                      <span key={p.id} className="offer-selected-chip">
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="offer-form-submit"
            disabled={loading}
          >
            {loading
              ? "جاري الحفظ..."
              : isEdit
              ? "حفظ التعديلات"
              : "إنشاء العرض"}
          </button>
          <button
            type="button"
            className="offer-form-cancel"
            onClick={() => navigate("/deals")}
          >
            إلغاء
          </button>
        </div>

        {/* العمود الرئيسي */}
        <div className="offer-form-main">
          <div className="offer-form-card">
            <h3 className="offer-form-card-title">
              <FiTag />
              تفاصيل العرض
            </h3>

            <div className="offer-form-group">
              <label>اسم العرض *</label>
              <input
                type="text"
                placeholder="مثال: تخفيضات نهاية الموسم"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="offer-form-group">
              <label>نسبة الخصم (%) *</label>
              <input
                type="number"
                min={1}
                max={100}
                placeholder="25"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>

            <div className="offer-form-two-cols">
              <div className="offer-form-group">
                <label>تاريخ البداية *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="offer-form-group">
                <label>تاريخ الانتهاء *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      <ProductPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedProducts={selectedProducts}
        onConfirm={setSelectedProducts}
      />
    </div>
  );
};

export default OfferForm;

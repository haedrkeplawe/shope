import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiGift, FiUsers, FiEye, FiSliders, FiBell } from "react-icons/fi";
import { API_URL } from "../config/api";
import {
  COUPON_TYPE_OPTIONS,
  COUPON_SCOPE_OPTIONS,
} from "../utils/couponStatus";
import CustomerPickerModal from "../components/CustomerPickerModal";

/*
  CouponForm
  - فورم واحد مشترك لإنشاء كوبون جديد وتعديل كوبون موجود
  - type بيحدد ظهور "الحد الأقصى لمبلغ الخصم" (يخص النسبة المئوية بس)
  - scopeType بيحدد ظهور اختيار الزبائن المحددين

  ⚠️ إضافة: لو وصلنا هون قادمين من صفحة "السلات المتروكة" (زر "كوبون")،
  location.state بيحمل:
  - presetCustomer: الزبون جاهز مسبقًا (scopeType يترتب تلقائيًا على
    "زبائن محددين")
  - cartRecovery: قيمة/عدد قطع سلته وقت الإجراء - بيتبعت للباك إند مع
    logCartRecovery=true عشان يترسجل كمحاولة استرداد (شوف
    controllers/coupon.controller.js وmodels/cartRecoveryLog.js)

  خيار "إرسال إشعار فوري للزبون" ظاهر دايمًا لما النطاق "زبائن محددين"
  (مش بس بتدفق السلات المتروكة) - أي كوبون خاص بزبون/زبائن محددين
  المنطقي يوصلهم إشعار فوري فيه، مفيش داعي الكوبون يضل "مخفي" لحد ما
  الزبون يكتشفه صدفة
*/
const CouponForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const presetCustomer = !isEdit ? location.state?.presetCustomer : null;
  const cartRecovery = !isEdit ? location.state?.cartRecovery : null;

  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [maxUsagePerCustomer, setMaxUsagePerCustomer] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scopeType, setScopeType] = useState(
    presetCustomer ? "specific_customers" : "all",
  );
  const [selectedCustomers, setSelectedCustomers] = useState(
    presetCustomer ? [presetCustomer] : [],
  ); // [{id,fullName,phone}]
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // لو تعديل، هات بيانات الكوبون الحالي
  useEffect(() => {
    if (!isEdit) return;

    const fetchCoupon = async () => {
      try {
        const res = await fetch(`${API_URL}/coupons/${id}`, {
          credentials: "include",
        });
        const result = await res.json();

        if (!res.ok) {
          toast.error(result.message || "تعذر تحميل بيانات الكوبون");
          navigate("/coupons");
          return;
        }

        const coupon = result.coupon;
        setCode(coupon.code);
        setType(coupon.type);
        setDiscountValue(coupon.discountValue);
        setMaxDiscountAmount(coupon.maxDiscountAmount || "");
        setMinOrderAmount(coupon.minOrderAmount || "");
        setMaxUsage(coupon.maxUsage ?? "");
        setMaxUsagePerCustomer(coupon.maxUsagePerCustomer || 1);
        setStartDate(coupon.startDate?.slice(0, 10) || "");
        setEndDate(coupon.endDate?.slice(0, 10) || "");
        setScopeType(coupon.scopeType);
        setSelectedCustomers(coupon.customers || []);
      } catch (error) {
        toast.error("تعذر الاتصال بالسيرفر");
      } finally {
        setFetching(false);
      }
    };

    fetchCoupon();
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("كود الكوبون مطلوب");
      return;
    }
    if (!discountValue || discountValue < 1) {
      toast.error("قيمة الخصم غير صالحة");
      return;
    }
    if (type === "percentage" && discountValue > 100) {
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
    if (scopeType === "specific_customers" && selectedCustomers.length === 0) {
      toast.error("لازم تختار زبون واحد على الأقل");
      return;
    }

    const payload = {
      code: code.trim(),
      type,
      discountValue: Number(discountValue),
      maxDiscountAmount:
        type === "percentage" && maxDiscountAmount
          ? Number(maxDiscountAmount)
          : null,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxUsage: maxUsage ? Number(maxUsage) : null,
      maxUsagePerCustomer: Number(maxUsagePerCustomer) || 1,
      startDate,
      endDate,
      scopeType,
      customerIds:
        scopeType === "specific_customers"
          ? selectedCustomers.map((c) => c.id)
          : [],
      // بس عند الإنشاء، ولو النطاق "زبائن محددين" وخيار الإشعار مفعّل
      notifyCustomers:
        !isEdit && scopeType === "specific_customers" ? notifyCustomer : false,
      logCartRecovery:
        !isEdit && scopeType === "specific_customers" && Boolean(cartRecovery),
    };

    setLoading(true);
    try {
      const url = isEdit ? `${API_URL}/coupons/${id}` : `${API_URL}/coupons`;
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
      // لو جاي من تدفق "السلات المتروكة"، نرجّعه لنفس الصفحة يلي بدأ منها
      navigate(cartRecovery ? "/abandoned-carts" : "/coupons");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    setCode(result);
  };

  if (fetching) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  return (
    <div className="offer-form-page">
      <div className="offer-form-header">
        <h1 className="offer-form-title">
          {isEdit ? `تعديل الكوبون: ${code}` : "إنشاء كوبون جديد"}
        </h1>
        <p className="offer-form-subtitle">
          {isEdit
            ? "تعديل بيانات الكوبون"
            : cartRecovery
            ? `كوبون استرداد لسلة "${presetCustomer?.fullName}" المتروكة`
            : "إنشاء كود خصم جديد للمتجر"}
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
            <div className="offer-preview-card coupon-preview-card">
              <span className="offer-preview-badge">
                {COUPON_TYPE_OPTIONS.find((o) => o.value === type)?.label}
              </span>
              <span className="coupon-preview-code">{code || "CODE"}</span>
              <span className="offer-preview-percent">
                {discountValue || 0}
                {type === "percentage" ? "%" : " ل.س"}
              </span>
              <span className="offer-preview-dates">
                {startDate || "—"} — {endDate || "—"}
              </span>
            </div>
          </div>

          <div className="offer-form-card">
            <h3 className="offer-form-card-title">
              <FiUsers />
              تطبيق الكوبون على
            </h3>
            <div className="offer-target-options">
              {COUPON_SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="offer-target-option">
                  <input
                    type="radio"
                    name="scopeType"
                    checked={scopeType === opt.value}
                    onChange={() => setScopeType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {scopeType === "specific_customers" && (
              <div className="offer-form-group">
                <button
                  type="button"
                  className="offer-pick-products-btn"
                  onClick={() => setPickerOpen(true)}
                >
                  اختيار الزبائن ({selectedCustomers.length})
                </button>
                {selectedCustomers.length > 0 && (
                  <div className="offer-selected-products">
                    {selectedCustomers.map((c) => (
                      <span key={c.id} className="offer-selected-chip">
                        {c.fullName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isEdit && scopeType === "specific_customers" && (
              <label className="coupon-notify-toggle">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                />
                <FiBell />
                إرسال إشعار فوري للزبون بوصول الكوبون
              </label>
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
              : "إنشاء الكوبون"}
          </button>
          <button
            type="button"
            className="offer-form-cancel"
            onClick={() =>
              navigate(cartRecovery ? "/abandoned-carts" : "/coupons")
            }
          >
            إلغاء
          </button>
        </div>

        {/* العمود الرئيسي */}
        <div className="offer-form-main">
          <div className="offer-form-card">
            <h3 className="offer-form-card-title">
              <FiGift />
              تفاصيل الكوبون
            </h3>

            <div className="offer-form-group">
              <label>كود الكوبون *</label>
              <div className="coupon-code-input-row">
                <input
                  type="text"
                  placeholder="مثال: SUMMER25"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ textTransform: "uppercase" }}
                />
                <button
                  type="button"
                  className="coupon-generate-btn"
                  onClick={generateRandomCode}
                >
                  توليد
                </button>
              </div>
            </div>

            <div className="offer-form-group">
              <label>نوع الكوبون *</label>
              <div className="offer-target-options offer-target-options--row">
                {COUPON_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="offer-target-option">
                    <input
                      type="radio"
                      name="type"
                      checked={type === opt.value}
                      onChange={() => setType(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="offer-form-two-cols">
              <div className="offer-form-group">
                <label>
                  {type === "percentage"
                    ? "نسبة الخصم (%) *"
                    : "قيمة الخصم (ل.س) *"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={type === "percentage" ? 100 : undefined}
                  placeholder={type === "percentage" ? "25" : "50000"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              {type === "percentage" && (
                <div className="offer-form-group">
                  <label>حد أقصى لمبلغ الخصم (اختياري)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="بدون حد أقصى"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  />
                </div>
              )}
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

          <div className="offer-form-card">
            <h3 className="offer-form-card-title">
              <FiSliders />
              شروط الاستخدام
            </h3>

            <div className="offer-form-two-cols">
              <div className="offer-form-group">
                <label>الحد الأدنى لمجموع الطلب (ل.س)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                />
              </div>
              <div className="offer-form-group">
                <label>الحد الأقصى لعدد الاستخدامات الكلي (اختياري)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="غير محدود"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)}
                />
              </div>
            </div>

            <div className="offer-form-group">
              <label>الحد الأقصى للاستخدام لكل زبون</label>
              <input
                type="number"
                min={1}
                value={maxUsagePerCustomer}
                onChange={(e) => setMaxUsagePerCustomer(e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>

      <CustomerPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedCustomers={selectedCustomers}
        onConfirm={setSelectedCustomers}
      />
    </div>
  );
};

export default CouponForm;

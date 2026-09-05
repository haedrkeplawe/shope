// user
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCheck, FiDollarSign, FiEdit2 } from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const EMPTY_TOTALS = {
  totalQuantity: 0,
  subtotal: 0,
  totalSavings: 0,
  shippingTotal: 0,
  grandTotal: 0,
};

/*
  Checkout (إتمام الطلب)
  - خطوتين بس: معلومات التوصيل، ثم مراجعة وتأكيد. مفيش خطوة "طريقة دفع"
    منفصلة لأنه الدفع نقدًا عند الاستلام حصرًا حاليًا - بيترعرض كملاحظة
    ثابتة بخطوة المراجعة مباشرة بدل ما نبني اختيار مالوش داعي
  - حقول التوصيل معبّاة تلقائيًا من بيانات حساب الزبون (الاسم/الهاتف/
    الإيميل) كقيم افتراضية بس - مو إلزامية، الزبون حر يعدّلها بالكامل
    قبل ما يأكد الطلب
  - السعر والمجاميع هون مش محسوبة بالفرونت - بتنجلب جاهزة من /customers/cart
    (نفس مصدر الحقيقة يلي بيستخدمه السيرفر وقت إنشاء الطلب فعليًا)
*/
const Checkout = () => {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const { refreshCartCount } = useCart();

  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shipping, setShipping] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    region: "",
    postalCode: "",
  });

  // تعبئة تلقائية من بيانات الحساب أول ما توفرت - بس مرة وحدة، مش بتفرض
  // نفسها لو الزبون أصلاً عدّل الحقول بنفسه
  useEffect(() => {
    if (!customer) return;
    setShipping((prev) => ({
      ...prev,
      fullName: prev.fullName || customer.fullName || "",
      phone: prev.phone || customer.phone || "",
      email: prev.email || customer.email || "",
    }));
  }, [customer]);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/cart`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const available = (data.items || []).filter((i) => i.available);
        if (available.length === 0) {
          toast.error("سلتك فاضية");
          navigate("/cart");
          return;
        }

        setItems(available);
        setTotals(data.totals || EMPTY_TOTALS);
      } catch (error) {
        // تجاهل - الصفحة رح تعرض حالة تحميل فاضية
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (e) =>
    setShipping((prev) => ({ ...prev, [field]: e.target.value }));

  const isStep1Valid =
    shipping.fullName.trim() &&
    shipping.phone.trim() &&
    shipping.address.trim() &&
    shipping.city.trim();

  const handleNext = () => {
    if (!isStep1Valid) {
      toast.error("الرجاء تعبئة الاسم ورقم الهاتف والعنوان والمدينة");
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleConfirmOrder = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipping }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذّر إتمام الطلب");
        if (res.status === 409) navigate("/cart");
        return;
      }

      refreshCartCount();
      navigate(`/orders/${data.order.id}`, { state: { justPlaced: true } });
    } catch (error) {
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="checkout-page">
      <h1 className="checkout-title">إتمام الطلب</h1>

      {/* -------------------- مؤشر الخطوات -------------------- */}
      <div className="checkout-stepper">
        <div
          className={`checkout-step${
            step >= 1 ? " checkout-step--active" : ""
          }`}
        >
          <span className="checkout-step-circle">
            {step > 1 ? <FiCheck /> : "1"}
          </span>
          <span>معلومات التوصيل</span>
        </div>
        <div className="checkout-step-line" />
        <div
          className={`checkout-step${
            step >= 2 ? " checkout-step--active" : ""
          }`}
        >
          <span className="checkout-step-circle">2</span>
          <span>المراجعة والتأكيد</span>
        </div>
      </div>

      {/* -------------------- خطوة 1: معلومات التوصيل -------------------- */}
      {step === 1 && (
        <div className="checkout-card">
          <h2 className="checkout-card-title">معلومات التوصيل</h2>

          <div className="checkout-field">
            <label>الاسم الكامل</label>
            <input
              type="text"
              value={shipping.fullName}
              onChange={handleChange("fullName")}
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          <div className="checkout-field">
            <label>رقم الهاتف</label>
            <input
              type="tel"
              value={shipping.phone}
              onChange={handleChange("phone")}
              placeholder="09XXXXXXXX"
            />
          </div>

          <div className="checkout-field">
            <label>البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              value={shipping.email}
              onChange={handleChange("email")}
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>

          <div className="checkout-field">
            <label>العنوان</label>
            <input
              type="text"
              value={shipping.address}
              onChange={handleChange("address")}
              placeholder="الشارع، الحي"
            />
          </div>

          <div className="checkout-field">
            <label>المدينة</label>
            <input
              type="text"
              value={shipping.city}
              onChange={handleChange("city")}
              placeholder="المدينة"
            />
          </div>

          <div className="checkout-field">
            <label>المنطقة (اختياري)</label>
            <input
              type="text"
              value={shipping.region}
              onChange={handleChange("region")}
              placeholder="المنطقة"
            />
          </div>

          <div className="checkout-field">
            <label>الرمز البريدي (اختياري)</label>
            <input
              type="text"
              value={shipping.postalCode}
              onChange={handleChange("postalCode")}
              placeholder="الرمز البريدي"
            />
          </div>

          <button
            type="button"
            className="checkout-next-btn"
            onClick={handleNext}
          >
            التالي: المراجعة والتأكيد
          </button>
        </div>
      )}

      {/* -------------------- خطوة 2: المراجعة والتأكيد -------------------- */}
      {step === 2 && (
        <>
          <div className="checkout-card">
            <div className="checkout-card-header">
              <h2 className="checkout-card-title">معلومات التوصيل</h2>
              <button
                type="button"
                className="checkout-edit-btn"
                onClick={() => setStep(1)}
              >
                <FiEdit2 /> تعديل
              </button>
            </div>
            <p className="checkout-shipping-summary">
              {shipping.fullName} - {shipping.phone}
              <br />
              {shipping.address}، {shipping.city}
              {shipping.region ? `، ${shipping.region}` : ""}
            </p>
          </div>

          <div className="checkout-card">
            <h2 className="checkout-card-title">طريقة الدفع</h2>
            <div className="checkout-payment-notice">
              <FiDollarSign />
              <div>
                <strong>الدفع نقدًا عند الاستلام</strong>
                <p>بتدفع القيمة كاملة لمندوب التوصيل وقت استلام طلبك</p>
              </div>
            </div>
          </div>

          <div className="checkout-card">
            <h2 className="checkout-card-title">مراجعة الطلب</h2>
            <div className="checkout-items">
              {items.map((item) => (
                <div key={item.id} className="checkout-item">
                  <div className="checkout-item-image">
                    {item.image && (
                      <img src={getImageUrl(item.image)} alt={item.name} />
                    )}
                  </div>
                  <div className="checkout-item-info">
                    {item.brand && <span>{item.brand}</span>}
                    <h4>{item.name}</h4>
                    {(item.color || item.size) && (
                      <div className="checkout-item-variant">
                        {item.color && (
                          <span className="checkout-item-variant-tag">
                            {item.colorHex && (
                              <span
                                className="checkout-item-color-dot"
                                style={{ backgroundColor: item.colorHex }}
                              />
                            )}
                            {item.colorLabel || item.color}
                          </span>
                        )}
                        {item.size && (
                          <span className="checkout-item-variant-tag">
                            المقاس: {item.size}
                          </span>
                        )}
                      </div>
                    )}
                    <p>الكمية: {item.quantity}</p>
                  </div>
                  <span className="checkout-item-price">
                    {formatPrice(item.lineTotal)} ل.س
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="checkout-summary">
            <div className="checkout-summary-row">
              <span>المنتجات ({totals.totalQuantity})</span>
              <span>{formatPrice(totals.subtotal)} ل.س</span>
            </div>
            {totals.totalSavings > 0 && (
              <div className="checkout-summary-row checkout-summary-row--savings">
                <span>وفّرت</span>
                <span>{formatPrice(totals.totalSavings)} ل.س</span>
              </div>
            )}
            <div className="checkout-summary-row">
              <span>الشحن</span>
              <span>
                {totals.shippingTotal > 0
                  ? `${formatPrice(totals.shippingTotal)} ل.س`
                  : "مجاني"}
              </span>
            </div>
            <div className="checkout-summary-row checkout-summary-row--total">
              <span>الإجمالي</span>
              <span>{formatPrice(totals.grandTotal)} ل.س</span>
            </div>
          </div>

          <div className="checkout-actions">
            <button
              type="button"
              className="checkout-confirm-btn"
              onClick={handleConfirmOrder}
              disabled={submitting}
            >
              {submitting
                ? "جاري تأكيد الطلب..."
                : `تأكيد الطلب - ${formatPrice(totals.grandTotal)} ل.س`}
            </button>
            <button
              type="button"
              className="checkout-back-btn"
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              السابق
            </button>
          </div>
        </>
      )}

      <p className="checkout-secure-note">
        <FiCheck /> دفع آمن ومشفّر بتقنية SSL 256-bit
      </p>

      <Link to="/cart" className="checkout-cancel-link">
        الرجوع للسلة
      </Link>
    </div>
  );
};

export default Checkout;

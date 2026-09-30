// user
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiDollarSign,
  FiEdit2,
  FiShare2,
  FiTag,
  FiTruck,
  FiUpload,
  FiZoomIn,
  FiDownload,
  FiX,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const EMPTY_TOTALS = {
  totalQuantity: 0,
  subtotal: 0,
  totalSavings: 0,
  couponCode: null,
  couponDiscount: 0,
  grandTotal: 0,
};

/*
  Checkout (إتمام الطلب)
  - خطوتين بس: معلومات التوصيل، ثم مراجعة وتأكيد. طريقة الدفع صارت
    جزء من خطوة المراجعة نفسها (مش خطوة تالتة منفصلة) - راديو اختيار
    لو الطريقتين مفعّلتين بإعدادات المتجر، وإلا بتترعرض الطريقة الوحيدة
    المتاحة كملاحظة ثابتة زي الوضع القديم بالضبط
  - حقول التوصيل معبّاة تلقائيًا من بيانات حساب الزبون (الاسم/الهاتف/
    الإيميل) كقيم افتراضية بس - مو إلزامية، الزبون حر يعدّلها بالكامل
    قبل ما يأكد الطلب
  - السعر والمجاميع هون مش محسوبة بالفرونت - بتنجلب جاهزة من /customers/cart
    (نفس مصدر الحقيقة يلي بيستخدمه السيرفر وقت إنشاء الطلب فعليًا) - بما
    فيها خصم أي كوبون مطبّق أصلاً من صفحة السلة
  - الكوبون بيتعرض هون للقراءة بس (بدون إدخال كود جديد) - أي تعديل عليه
    (تطبيق/إزالة) بيصير من صفحة السلة نفسها عبر رابط "تعديل" بالأسفل،
    عشان نتفادى ازدواجية نفس منطق التطبيق بمكانين مختلفين

  ⚠️ تحديث نظام الشحن: "المدينة" بقت قائمة اختيار (مش نص حر) معبّاة من
  مناطق الشحن الفعالة (GET /shop/shipping-zones) - بمجرد ما الزبون يختار
  مدينته، منلاقي منطقة الشحن التابعة إلها ومنعرض معاينة فورية لسعر
  ومدة التوصيل. المعاينة هون بس للعرض - السعر النهائي الملزم بيتحسب
  ويتأكد منه السيرفر من جديد وقت تأكيد الطلب (نفس فلسفة إعادة التحقق من
  المخزون والكوبون تمامًا)

  ⚠️ إضافة: الدفع عبر شام كاش - لو الزبون اختارها، بيظهر QR تبع المتجر
  (GET /shop/payment-methods) + تذكير بالمبلغ المطلوب (نفس رقم الإجمالي
  الظاهر تحت بالضبط)، وحقل رفع صورة إيصال الدفع يصير إلزامي قبل ما يقدر
  يضغط "تأكيد الطلب". الطلب هلق بيترسل كـ FormData دايمًا (مش JSON خام)
  عشان يقدر يحمل صورة الإيصال - shipping بيترسل كنص JSON جوّاها (شوف
  handleConfirmOrder تحت)
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

  // رمز المسوّق (اختياري) - شوف utils/marketerEngine.js بالباك إند. بعكس
  // الكوبون، هاد الحقل مش مخزّن على حساب الزبون إطلاقًا - قرار إسناد
  // لمرة وحدة بس لحظة تأكيد الطلب، بيترسل مباشرة مع POST /orders
  const [marketerCode, setMarketerCode] = useState("");

  // مناطق الشحن الفعالة - مصدرها GET /shop/shipping-zones (شوف الشرح فوق)
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  // طرق الدفع المتاحة فعليًا حسب إعدادات المتجر - مصدرها
  // GET /shop/payment-methods (شوف الشرح فوق)
  const [paymentMethods, setPaymentMethods] = useState({
    cashEnabled: true,
    shamCashEnabled: false,
    shamCashQrImage: null,
  });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  // عرض صورة QR بملء الشاشة - نفس نمط الـ Lightbox المستخدم بمعرض صور
  // المنتج بالضبط (pd-lightbox)، عشان الزبون يقدر يشوفها بوضوح كافي
  // لمسحها ضوئيًا أو تصويرها
  const [qrZoomOpen, setQrZoomOpen] = useState(false);

  const [shipping, setShipping] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });

  // تعبئة تلقائية من بيانات الحساب أول ما توفرت - بس مرة وحدة، مش بتفرض
  // نفسها لو الزبون أصلاً عدّل الحقول بنفسه
  useEffect(() => {
    if (!customer) return;
    setShipping((prev) => ({
      ...prev,
      fullName: prev.fullName || customer.fullName || "",
      phone: prev.phone || customer.phone || "",
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

        if (data.couponRemovedMessage) {
          toast.error(data.couponRemovedMessage);
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

  // جلب مناطق الشحن الفعالة مرة وحدة عند فتح الصفحة - نفس مصدر البيانات
  // يلي الأدمن بيديره من صفحة "الشحن والتوصيل"
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/shipping-zones`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setZones(data.zones || []);
      } catch (error) {
        // تجاهل - حقل المدينة هيفضل فاضي والزبون ما بيقدر يكمل للخطوة الجاية
      } finally {
        setZonesLoading(false);
      }
    };

    fetchZones();
  }, []);

  // جلب طرق الدفع المتاحة فعليًا مرة وحدة عند فتح الصفحة - لو طريقة
  // الدفع الافتراضية (نقدًا) معطّلة بإعدادات المتجر، منحوّل تلقائيًا
  // لشام كاش (المفروض واحدة عالأقل مفعّلة دايمًا - شوف store.controller.js)
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/payment-methods`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          setPaymentMethods(data);
          if (!data.cashEnabled && data.shamCashEnabled) {
            setPaymentMethod("shamcash");
          }
        }
      } catch (error) {
        // تجاهل - هيضل الافتراضي (نقدًا) ظاهر
      }
    };

    fetchPaymentMethods();
  }, []);

  // معاينة محلية لصورة الإيصال المختارة - بتتحرر من الذاكرة لحظة تغيير
  // الملف أو مغادرة الصفحة (نفس أسلوب معاينة صورة الفئة بلوحة الأدمن)
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  // تحميل صورة QR فعليًا على جهاز الزبون - بنجيبها كـ Blob أول (مش رابط
  // <a download> مباشر) لأنها مستضافة على Cloudinary (رابط من نطاق
  // مختلف)، ومتصفحات كتير (خصوصًا Safari) بتتجاهل خاصية download على
  // روابط الصور الخارجية وبتفتحها بس بدل ما تنزّلها - نفس أسلوب تصدير
  // CSV بلوحة تحكم الأدمن بالضبط (Orders.jsx → handleExport)
  const handleDownloadQr = async () => {
    try {
      const res = await fetch(getImageUrl(paymentMethods.shamCashQrImage));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "شام-كاش-QR.png";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("تعذّر تحميل الصورة، حاول مرة أخرى");
    }
  };

  // إيجاد منطقة الشحن التابعة إلها مدينة معينة (مطابقة case-insensitive)
  const findZoneByCity = (city) =>
    zones.find((zone) =>
      zone.cities.some((c) => c.toLowerCase() === city.toLowerCase()),
    );

  const selectedZone = shipping.city ? findZoneByCity(shipping.city) : null;

  // معاينة سعر الشحن بناءً على المنطقة المختارة ومجموع السلة الحالي -
  // للعرض بس، السعر النهائي الملزم بيتحسب ويتأكد منه السيرفر من جديد
  // وقت تأكيد الطلب (شوف التعليق أعلى الملف)
  const shippingPreview = selectedZone
    ? {
        isFree:
          selectedZone.freeShippingThreshold !== null &&
          totals.subtotal >= selectedZone.freeShippingThreshold,
        price: selectedZone.price,
        durationLabel: selectedZone.durationLabel,
      }
    : null;
  const shippingPrice = shippingPreview
    ? shippingPreview.isFree
      ? 0
      : shippingPreview.price
    : 0;
  const grandTotalWithShipping = Math.max(0, totals.grandTotal) + shippingPrice;

  const handleChange = (field) => (e) =>
    setShipping((prev) => ({ ...prev, [field]: e.target.value }));

  const isStep1Valid =
    shipping.fullName.trim() &&
    shipping.phone.trim() &&
    shipping.address.trim() &&
    shipping.city.trim() &&
    Boolean(selectedZone);

  const handleNext = () => {
    if (!isStep1Valid) {
      toast.error(
        !shipping.city.trim() || !selectedZone
          ? "الرجاء اختيار مدينة التوصيل"
          : "الرجاء تعبئة الاسم ورقم الهاتف والعنوان",
      );
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleConfirmOrder = async () => {
    if (paymentMethod === "shamcash" && !receiptFile) {
      toast.error("الرجاء رفع صورة إيصال الدفع");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("shipping", JSON.stringify(shipping));
      formData.append("shippingZoneId", selectedZone?.id || "");
      formData.append("marketerCode", marketerCode.trim());
      formData.append("paymentMethod", paymentMethod);
      if (paymentMethod === "shamcash" && receiptFile) {
        formData.append("paymentReceiptImage", receiptFile);
      }

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        credentials: "include",
        body: formData,
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

  if (loading) {
    return (
      <div className="page-loading">
        <span className="page-spinner" />
      </div>
    );
  }

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
            <select
              value={shipping.city}
              onChange={handleChange("city")}
              disabled={zonesLoading}
            >
              <option value="">
                {zonesLoading ? "جاري تحميل المدن..." : "اختر مدينتك"}
              </option>
              {zones.map((zone) => (
                <optgroup key={zone.id} label={zone.name}>
                  {zone.cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {!zonesLoading && zones.length === 0 && (
              <p className="checkout-field-hint">
                لا توجد مناطق شحن متاحة حاليًا، الرجاء المحاولة لاحقًا
              </p>
            )}
          </div>

          {shippingPreview && (
            <div className="checkout-payment-notice checkout-shipping-preview">
              <FiTruck />
              <div>
                <strong>
                  {shippingPreview.isFree
                    ? "شحن مجاني لهذه المدينة"
                    : `رسوم الشحن: ${shippingPreview.price.toLocaleString(
                        "en-US",
                      )} ل.س`}
                </strong>
                <p>يصل خلال {shippingPreview.durationLabel}</p>
              </div>
            </div>
          )}

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
              {shippingPreview && (
                <>
                  <br />
                  التوصيل خلال {shippingPreview.durationLabel}
                </>
              )}
            </p>
          </div>

          <div className="checkout-card">
            <h2 className="checkout-card-title">طريقة الدفع</h2>

            {paymentMethods.cashEnabled && paymentMethods.shamCashEnabled ? (
              <div className="checkout-payment-options">
                <label
                  className={`checkout-payment-option${
                    paymentMethod === "cash"
                      ? " checkout-payment-option--active"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                  />
                  <FiDollarSign />
                  <div>
                    <strong>الدفع نقدًا عند الاستلام</strong>
                    <p>بتدفع القيمة كاملة لمندوب التوصيل وقت استلام طلبك</p>
                  </div>
                </label>

                <label
                  className={`checkout-payment-option${
                    paymentMethod === "shamcash"
                      ? " checkout-payment-option--active"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "shamcash"}
                    onChange={() => setPaymentMethod("shamcash")}
                  />
                  <FiUpload />
                  <div>
                    <strong>الدفع عبر شام كاش</strong>
                    <p>حوّل المبلغ عبر تطبيق شام كاش وارفع صورة الإيصال</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="checkout-payment-notice">
                <FiDollarSign />
                <div>
                  <strong>
                    {paymentMethods.cashEnabled
                      ? "الدفع نقدًا عند الاستلام"
                      : "الدفع عبر شام كاش"}
                  </strong>
                  <p>
                    {paymentMethods.cashEnabled
                      ? "بتدفع القيمة كاملة لمندوب التوصيل وقت استلام طلبك"
                      : "حوّل المبلغ عبر تطبيق شام كاش وارفع صورة الإيصال"}
                  </p>
                </div>
              </div>
            )}

            {paymentMethod === "shamcash" && (
              <div className="checkout-shamcash-box">
                {paymentMethods.shamCashQrImage ? (
                  <>
                    <div className="checkout-shamcash-qr-wrap">
                      <img
                        src={getImageUrl(paymentMethods.shamCashQrImage)}
                        alt="رمز QR لشام كاش"
                        className="checkout-shamcash-qr"
                        onClick={() => setQrZoomOpen(true)}
                      />
                      <button
                        type="button"
                        className="checkout-shamcash-qr-zoom-btn"
                        aria-label="تكبير الصورة"
                        onClick={() => setQrZoomOpen(true)}
                      >
                        <FiZoomIn />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="checkout-shamcash-qr-download"
                      onClick={handleDownloadQr}
                    >
                      <FiDownload /> تحميل صورة QR
                    </button>
                  </>
                ) : (
                  <p className="checkout-shamcash-missing">
                    صورة رمز QR غير متوفرة حاليًا، الرجاء التواصل معنا أو اختيار
                    طريقة دفع أخرى
                  </p>
                )}

                <p className="checkout-shamcash-amount">
                  المبلغ المطلوب تحويله:{" "}
                  <strong>
                    {grandTotalWithShipping.toLocaleString("en-US")} ل.س
                  </strong>
                </p>

                <label className="checkout-receipt-upload">
                  {receiptPreview ? (
                    <>
                      <img src={receiptPreview} alt="معاينة الإيصال" />
                      <div className="checkout-receipt-upload-overlay">
                        <FiUpload />
                        تغيير الصورة
                      </div>
                    </>
                  ) : (
                    <div className="checkout-receipt-upload-empty">
                      <FiUpload />
                      <span>اضغط لرفع صورة إيصال الدفع</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    hidden
                  />
                </label>
              </div>
            )}
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

          {totals.couponCode && (
            <div className="checkout-card">
              <div className="checkout-card-header">
                <h2 className="checkout-card-title">
                  <FiTag /> الكوبون المطبّق
                </h2>
                <Link to="/cart" className="checkout-edit-btn">
                  <FiEdit2 /> تعديل
                </Link>
              </div>
              <p className="checkout-shipping-summary">
                كود <strong>{totals.couponCode}</strong> - خصم{" "}
                {formatPrice(totals.couponDiscount)} ل.س
              </p>
            </div>
          )}

          {/* رمز المسوّق (اختياري) - مستقل تمامًا عن الكوبون، بيترسل مع
              الطلب مباشرة وبيتحقق منه السيرفر نهائيًا لحظة التأكيد */}
          <div className="checkout-card">
            <h2 className="checkout-card-title">
              <FiShare2 /> رمز مسوّق (اختياري)
            </h2>
            <input
              type="text"
              className="checkout-marketer-input"
              placeholder="أدخل رمز المسوّق إن وجد"
              value={marketerCode}
              onChange={(e) => setMarketerCode(e.target.value)}
              dir="ltr"
            />
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
            {totals.couponDiscount > 0 && (
              <div className="checkout-summary-row checkout-summary-row--coupon">
                <span>خصم الكوبون ({totals.couponCode})</span>
                <span>- {formatPrice(totals.couponDiscount)} ل.س</span>
              </div>
            )}
            <div className="checkout-summary-row">
              <span>الشحن</span>
              <span>
                {shippingPreview
                  ? shippingPreview.isFree
                    ? "مجاني"
                    : `${shippingPrice.toLocaleString("en-US")} ل.س`
                  : "—"}
              </span>
            </div>
            <div className="checkout-summary-row checkout-summary-row--total">
              <span>الإجمالي</span>
              <span>{grandTotalWithShipping.toLocaleString("en-US")} ل.س</span>
            </div>
          </div>

          <div className="checkout-actions">
            <button
              type="button"
              className="checkout-confirm-btn"
              onClick={handleConfirmOrder}
              disabled={
                submitting || (paymentMethod === "shamcash" && !receiptFile)
              }
            >
              {submitting
                ? "جاري تأكيد الطلب..."
                : `تأكيد الطلب - ${grandTotalWithShipping.toLocaleString(
                    "en-US",
                  )} ل.س`}
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

      {qrZoomOpen && paymentMethods.shamCashQrImage && (
        <div className="pd-lightbox" onClick={() => setQrZoomOpen(false)}>
          <button
            type="button"
            className="pd-lightbox-close"
            aria-label="إغلاق"
            onClick={() => setQrZoomOpen(false)}
          >
            <FiX />
          </button>
          <button
            type="button"
            className="pd-lightbox-download"
            aria-label="تحميل الصورة"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadQr();
            }}
          >
            <FiDownload />
          </button>
          <img
            src={getImageUrl(paymentMethods.shamCashQrImage)}
            alt="رمز QR لشام كاش"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Checkout;

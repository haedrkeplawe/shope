// user
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiShoppingBag, FiTrash, FiTag, FiX, FiLogIn } from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  getGuestCart,
  updateGuestCartItemQuantity,
  removeGuestCartItem,
  clearGuestCart,
  reconcileGuestCart,
} from "../utils/guestCart";
import CartItem from "../components/CartItem";

const EMPTY_TOTALS = {
  itemsCount: 0,
  totalQuantity: 0,
  subtotal: 0,
  totalOriginal: 0,
  totalSavings: 0,
  couponCode: null,
  couponType: null,
  couponDiscount: 0,
  membershipTierName: null,
  membershipDiscount: 0,
  membershipFreeShippingEligible: false,
  grandTotal: 0,
};

/*
  Cart (صفحة سلة المشتريات)
  - بتجيب السلة الحقيقية الكاملة من /api/customers/cart وقت الفتح (السعر
    والمجاميع محسوبة لحظيًا بالباك اند - نفس فلسفة applyOffers بكل الموقع)
  - تعديل الكمية وحذف سطر: تحديث متفائل فوري بالواجهة (Optimistic) + طلب
    بالخلفية، ولو فشل بنرجّع الحالة القديمة (نفس أسلوب FavoritesContext)
  - القطع الغير متاحة (اتحذفت/نفذت/اتوقفت) بتترسم بقسم منفصل تحت، وما
    بتدخل بحساب المجموع أبدًا
  - الكوبون: صندوق إدخال كود بالملخص - بيتطبق فورًا عبر /customers/cart/coupon
    ولو مطبّق أصلاً بيتعرض كـ"شريحة" بكودها مع زر إزالة. السعر بعد الكوبون
    محسوب بالكامل من السيرفر (نفس فلسفة السعر الفعّال بكل مكان بالموقع) -
    مفيش أي حساب كوبون يدوي بالفرونت أبدًا
  - "إتمام الطلب" بيودي فعليًا لصفحة /checkout الحقيقية (خطوتين: توصيل ثم
    مراجعة وتأكيد) - نظام الطلبات مكتمل بالكامل

  ⚠️ تحديث الميزة الجديدة (تصفح بدون تسجيل دخول): زائر بلا حساب سلته
  محلية بالكامل (localStorage - utils/guestCart.js)، والتسعير الحي
  بيجي من /api/shop/cart/preview (نفس utils/serializeCart.js المستخدمة
  لسلة الزبون المسجل بالضبط - صفر تكرار منطق تسعير، فباقي الصفحة تحت -
  عرض العناصر، القطع الغير متاحة، المجاميع - بترسم زي ما هي بدون أي فرق).
  الكوبون حصريًا لزبون مسجل دخوله (شوف شرح كامل بـgetCartPreview بالباك
  اند) - صندوقه مخفي كليًا للزائر بدل ما يظهر ويفشل. "إتمام الطلب" بيودّي
  لـ/checkout المحمية أصلاً بتسجيل الدخول - الزائر بينرجّع لتسجيل الدخول
  تلقائيًا وبترجعله سلته معاه بعدها (دمج تلقائي، شوف CartContext.jsx →
  mergeGuestCart)
*/
const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { refreshCartCount } = useCart();

  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // -------------------- زبون مسجل: السلة الحقيقية بالباك اند --------------------
  const fetchCustomerCart = async () => {
    try {
      const res = await fetch(`${API_URL}/customers/cart`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotals(data.totals || EMPTY_TOTALS);
        if (data.couponRemovedMessage) {
          toast.error(data.couponRemovedMessage);
        }
      }
    } catch (error) {
      // تجاهل - بترسم حالة فاضية زي ما لو مفيش سلة أصلاً
    }
  };

  // -------------------- زائر بلا حساب: معاينة لحظية لسلة localStorage --------------------
  const fetchGuestCart = async () => {
    const guestItems = getGuestCart();
    if (guestItems.length === 0) {
      setItems([]);
      setTotals(EMPTY_TOTALS);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/shop/cart/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: guestItems }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotals(data.totals || EMPTY_TOTALS);
        // بنزامن السلة المحلية مع نتيجة السيرفر (منتج محذوف/كمية اتصححت) -
        // شوف شرح reconcileGuestCart بـutils/guestCart.js
        reconcileGuestCart(data.items || []);
      }
    } catch (error) {
      // تجاهل
    }
  };

  const fetchCart = () =>
    isAuthenticated ? fetchCustomerCart() : fetchGuestCart();

  useEffect(() => {
    setLoading(true);
    fetchCart().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    const target = items.find((i) => i.id === itemId);
    if (!target || newQuantity < 1 || newQuantity > target.maxQuantity) return;

    // زائر بلا حساب - تعديل محلي ثم إعادة معاينة لحظية من السيرفر (بلا
    // حساب متفائل معقد - سلة الزائر عادة صغيرة، وطلب المعاينة خفيف)
    if (!isAuthenticated) {
      updateGuestCartItemQuantity(itemId, newQuantity);
      await fetchGuestCart();
      refreshCartCount();
      return;
    }

    const diff = newQuantity - target.quantity;
    const prevItems = items;
    const prevTotals = totals;
    const hasCoupon = Boolean(totals.couponCode);

    // تحديث متفائل فوري - السعر ثابت مهما تغيّرت الكمية، فحساب الفرق حسابي بسيط وآمن
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity: newQuantity, lineTotal: i.price * newQuantity }
          : i,
      ),
    );
    setTotals((prev) => ({
      ...prev,
      totalQuantity: prev.totalQuantity + diff,
      subtotal: prev.subtotal + target.price * diff,
      totalOriginal:
        prev.totalOriginal + (target.originalPrice || target.price) * diff,
      totalSavings: Math.max(
        0,
        prev.totalSavings +
          ((target.originalPrice || target.price) - target.price) * diff,
      ),
      grandTotal: prev.grandTotal + target.price * diff,
    }));

    try {
      const res = await fetch(`${API_URL}/customers/cart/item/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!res.ok) throw new Error("فشل تحديث الكمية");
      refreshCartCount();

      // لو في كوبون مطبّق، خصمه ممكن يتغيّر مع تغيّر المجموع (خصوصًا
      // النسبة المئوية) - المجموع المتفائل فوق ما بياخده بعين الاعتبار،
      // فبنعيد الجلب بهدوء بالخلفية عشان الأرقام تضل دقيقة 100%
      if (hasCoupon) {
        fetchCart();
      }
    } catch (error) {
      setItems(prevItems);
      setTotals(prevTotals);
      toast.error("تعذّر تحديث الكمية");
    }
  };

  const handleRemove = async (itemId) => {
    if (!isAuthenticated) {
      removeGuestCartItem(itemId);
      await fetchGuestCart();
      refreshCartCount();
      return;
    }

    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      const res = await fetch(`${API_URL}/customers/cart/item/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل الحذف");
      refreshCartCount();
      fetchCart(); // إعادة جلب المجاميع الصحيحة (وحالة الكوبون) بعد الحذف
    } catch (error) {
      setItems(prevItems);
      toast.error("تعذّر حذف القطعة");
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("متأكد إنك بدك تفرغ السلة بالكامل؟")) return;

    if (!isAuthenticated) {
      clearGuestCart();
      setItems([]);
      setTotals(EMPTY_TOTALS);
      setCouponInput("");
      refreshCartCount();
      toast.success("تم تفريغ السلة");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/customers/cart`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل التفريغ");
      setItems([]);
      setTotals(EMPTY_TOTALS);
      setCouponInput("");
      refreshCartCount();
      toast.success("تم تفريغ السلة");
    } catch (error) {
      toast.error("تعذّر تفريغ السلة");
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error("أدخل كود الكوبون");
      return;
    }

    setApplyingCoupon(true);
    try {
      const res = await fetch(`${API_URL}/customers/cart/coupon`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذّر تطبيق الكوبون");
        return;
      }

      setItems(data.items || []);
      setTotals(data.totals || EMPTY_TOTALS);
      setCouponInput("");
      toast.success(data.message || "تم تطبيق الكوبون بنجاح");
    } catch (error) {
      toast.error("تعذّر الاتصال بالسيرفر");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      const res = await fetch(`${API_URL}/customers/cart/coupon`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "تعذّر إلغاء الكوبون");
        return;
      }

      setItems(data.items || []);
      setTotals(data.totals || EMPTY_TOTALS);
      toast.success(data.message || "تم إلغاء الكوبون");
    } catch (error) {
      toast.error("تعذّر الاتصال بالسيرفر");
    }
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  if (loading) return null;

  const availableItems = items.filter((i) => i.available);
  const unavailableItems = items.filter((i) => !i.available);

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <FiShoppingBag className="cart-empty-icon" />
          <h2 className="cart-empty-title">سلتك فاضية لسه</h2>
          <p className="cart-empty-text">
            تصفّح المتجر وضيف أي قطعة عجبتك للسلة
          </p>
          <Link to="/" className="cart-empty-link">
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1 className="cart-title">سلة المشتريات</h1>
        {availableItems.length > 0 && (
          <button
            type="button"
            className="cart-clear-btn"
            onClick={handleClearCart}
          >
            <FiTrash /> تفريغ السلة
          </button>
        )}
      </div>

      {/* ⚠️ يظهر بس للزائر بلا حساب - شوف شرح كامل بأعلى الملف */}
      {!isAuthenticated && availableItems.length > 0 && (
        <div className="cart-guest-banner">
          <span>سجّل دخولك لتفعيل خصومات العضوية والكوبونات على هاي السلة</span>
          <Link to="/login" className="cart-guest-banner-link">
            <FiLogIn /> تسجيل الدخول
          </Link>
        </div>
      )}

      {availableItems.length > 0 && (
        <div className="cart-items-list">
          {availableItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {unavailableItems.length > 0 && (
        <div className="cart-unavailable-section">
          <h2 className="cart-section-title">قطع غير متاحة حاليًا</h2>
          <div className="cart-items-list">
            {unavailableItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      )}

      {availableItems.length > 0 && (
        <div className="cart-summary">
          {/* -------------------- صندوق الكوبون --------------------
              ⚠️ حصريًا لزبون مسجل دخوله - الكوبونات مرتبطة بحساب حقيقي
              دايمًا (حد استخدام، نطاق زبائن محددين...) فما إلها معنى
              لزائر بلا هوية، شوف شرح كامل بـshop.controller.js →
              getCartPreview */}
          {isAuthenticated && (
            <div className="cart-coupon-box">
              {totals.couponCode ? (
                <div className="cart-coupon-applied">
                  <span className="cart-coupon-applied-info">
                    <FiTag />
                    الكوبون <strong>{totals.couponCode}</strong> مطبّق
                  </span>
                  <button
                    type="button"
                    className="cart-coupon-remove-btn"
                    onClick={handleRemoveCoupon}
                  >
                    <FiX /> إزالة
                  </button>
                </div>
              ) : (
                <div className="cart-coupon-input-row">
                  <input
                    type="text"
                    placeholder="أدخل كود الكوبون"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="cart-coupon-apply-btn"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon}
                  >
                    {applyingCoupon ? "جاري التطبيق..." : "تطبيق"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="cart-summary-row">
            <span>
              المجموع الفرعي ({totals.totalQuantity}{" "}
              {totals.totalQuantity === 1 ? "قطعة" : "قطع"})
            </span>
            <span>{formatPrice(totals.subtotal)} ل.س</span>
          </div>

          {totals.totalSavings > 0 && (
            <div className="cart-summary-row cart-summary-row--savings">
              <span>وفّرت</span>
              <span>{formatPrice(totals.totalSavings)} ل.س</span>
            </div>
          )}

          {totals.couponDiscount > 0 && (
            <div className="cart-summary-row cart-summary-row--coupon">
              <span>خصم الكوبون ({totals.couponCode})</span>
              <span>- {formatPrice(totals.couponDiscount)} ل.س</span>
            </div>
          )}

          {/* ⚠️ مستقل كليًا عن الكوبون - يتطبق تلقائيًا حسب باقة عضويتك،
              بغض النظر عن وجود كوبون من عدمه */}
          {totals.membershipDiscount > 0 && (
            <div className="cart-summary-row cart-summary-row--membership">
              <span>خصم {totals.membershipTierName}</span>
              <span>- {formatPrice(totals.membershipDiscount)} ل.س</span>
            </div>
          )}

          <div className="cart-summary-row cart-summary-row--shipping-note">
            <span>الشحن</span>
            <span>
              {totals.membershipFreeShippingEligible
                ? "مجاني بفضل عضويتك ✓"
                : "يُحسب حسب مدينتك بصفحة الدفع"}
            </span>
          </div>

          <div className="cart-summary-row cart-summary-row--total">
            <span>الإجمالي (بدون الشحن)</span>
            <span>{formatPrice(totals.grandTotal)} ل.س</span>
          </div>

          <button
            type="button"
            className="cart-checkout-btn"
            onClick={handleCheckout}
          >
            إتمام الطلب
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;

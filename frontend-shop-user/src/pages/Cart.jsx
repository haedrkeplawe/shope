// user
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiShoppingBag, FiTrash } from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";

const EMPTY_TOTALS = {
  itemsCount: 0,
  totalQuantity: 0,
  subtotal: 0,
  totalOriginal: 0,
  totalSavings: 0,
  shippingTotal: 0,
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
  - "إتمام الطلب" حاليًا بس Toast "قريبًا" - مفيش نظام طلبات/دفع بالمشروع
    أصلاً لسه، هاي الخطوة الطبيعية الجاية بعد السلة مش جزء منها
*/
const Cart = () => {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_URL}/customers/cart`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotals(data.totals || EMPTY_TOTALS);
      }
    } catch (error) {
      // تجاهل - بترسم حالة فاضية زي ما لو مفيش سلة أصلاً
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    const target = items.find((i) => i.productId === productId);
    if (!target || newQuantity < 1 || newQuantity > target.maxQuantity) return;

    const diff = newQuantity - target.quantity;
    const prevItems = items;
    const prevTotals = totals;

    // تحديث متفائل فوري - السعر ثابت مهما تغيّرت الكمية، فحساب الفرق حسابي بسيط وآمن
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
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
      shippingTotal: prev.shippingTotal + target.shippingPrice * diff,
      totalSavings: Math.max(
        0,
        prev.totalSavings +
          ((target.originalPrice || target.price) - target.price) * diff,
      ),
      grandTotal:
        prev.grandTotal + (target.price + target.shippingPrice) * diff,
    }));

    try {
      const res = await fetch(`${API_URL}/customers/cart/${productId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!res.ok) throw new Error("فشل تحديث الكمية");
      refreshCartCount();
    } catch (error) {
      setItems(prevItems);
      setTotals(prevTotals);
      toast.error("تعذّر تحديث الكمية");
    }
  };

  const handleRemove = async (productId) => {
    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.productId !== productId));

    try {
      const res = await fetch(`${API_URL}/customers/cart/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل الحذف");
      refreshCartCount();
      fetchCart(); // إعادة جلب المجاميع الصحيحة بعد الحذف
    } catch (error) {
      setItems(prevItems);
      toast.error("تعذّر حذف القطعة");
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("متأكد إنك بدك تفرغ السلة بالكامل؟")) return;

    try {
      const res = await fetch(`${API_URL}/customers/cart`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل التفريغ");
      setItems([]);
      setTotals(EMPTY_TOTALS);
      refreshCartCount();
      toast.success("تم تفريغ السلة");
    } catch (error) {
      toast.error("تعذّر تفريغ السلة");
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

      {availableItems.length > 0 && (
        <div className="cart-items-list">
          {availableItems.map((item) => (
            <CartItem
              key={item.productId}
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
                key={item.productId}
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

          <div className="cart-summary-row">
            <span>الشحن</span>
            <span>
              {totals.shippingTotal > 0
                ? `${formatPrice(totals.shippingTotal)} ل.س`
                : "مجاني"}
            </span>
          </div>

          <div className="cart-summary-row cart-summary-row--total">
            <span>الإجمالي</span>
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

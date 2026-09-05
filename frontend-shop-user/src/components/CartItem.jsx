// user
import {
  FiPlus,
  FiMinus,
  FiTrash2,
  FiAlertTriangle,
  FiImage,
} from "react-icons/fi";
import { getImageUrl } from "../config/api";
import { formatPrice } from "../utils/formatPrice";

const UNAVAILABLE_TEXT = {
  not_found: "هاي القطعة اتحذفت من المتجر",
  sold: "نفذت الكمية من هاي القطعة",
  unpublished: "هاي القطعة غير متاحة حاليًا",
};

/*
  CartItem
  - سطر واحد بصفحة السلة - له شكلين:
    1) متاح (available:true): صورة + اسم + براند + لون + مقاس + سعر + Stepper كمية
    2) غير متاح (available:false): نفس الشكل بس بدون سعر/Stepper، مع رسالة
       توضيحية ليش (اتحذف / نفذ / اتوقف) وزر حذف بس
  - ⚠️ الهوية هون هي item.id (معرّف سطر السلة نفسه) مش item.productId -
    لأنه بقى ممكن يتكرر نفس المنتج بأكتر من سطر بالسلة (لون/مقاس مختلف)،
    فمعرّف المنتج لحاله ما عاد كافي يحدد أي سطر بالضبط نقصده بالتحديث/الحذف
  - quantityAdjusted: لو السيرفر عدّل الكمية تلقائيًا وقت آخر قراءة (لأن
    المخزون نقص عن الكمية المطلوبة أصلاً - يشمل كمان المخزون المشترك مع
    أسطر تانية لنفس المنتج بمقاس/لون مختلف)، بنعرض ملاحظة صغيرة توضح هيك
*/
const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {item.image ? (
          <img src={getImageUrl(item.image)} alt={item.name || "منتج"} />
        ) : (
          <FiImage />
        )}
      </div>

      <div className="cart-item-body">
        {item.brand && <span className="cart-item-brand">{item.brand}</span>}
        <h3 className="cart-item-name">{item.name || "منتج غير معروف"}</h3>

        {(item.color || item.size) && (
          <div className="cart-item-variant">
            {item.color && (
              <span className="cart-item-variant-tag">
                {item.colorHex && (
                  <span
                    className="cart-item-color-dot"
                    style={{ backgroundColor: item.colorHex }}
                  />
                )}
                {item.colorLabel || item.color}
              </span>
            )}
            {item.size && (
              <span className="cart-item-variant-tag">المقاس: {item.size}</span>
            )}
          </div>
        )}

        {item.available ? (
          <>
            <div className="cart-item-price-row">
              <span className="cart-item-price">
                {formatPrice(item.price)} ل.س
              </span>
              {item.originalPrice && (
                <span className="cart-item-original-price">
                  {formatPrice(item.originalPrice)}
                </span>
              )}
              {item.discountPercent && (
                <span className="cart-item-discount">
                  {item.discountPercent}%-
                </span>
              )}
            </div>

            {item.quantityAdjusted && (
              <p className="cart-item-adjusted-note">
                <FiAlertTriangle /> الكمية اتعدّلت - المتوفر فعليًا{" "}
                {item.maxQuantity} بس
              </p>
            )}

            <div className="cart-item-footer">
              <div className="cart-item-stepper">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label="إنقاص الكمية"
                >
                  <FiMinus />
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  aria-label="زيادة الكمية"
                >
                  <FiPlus />
                </button>
              </div>

              <button
                type="button"
                className="cart-item-remove"
                onClick={() => onRemove(item.id)}
                aria-label="حذف من السلة"
              >
                <FiTrash2 />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="cart-item-unavailable">
              <FiAlertTriangle />{" "}
              {UNAVAILABLE_TEXT[item.unavailableReason] ||
                "هاي القطعة غير متاحة حاليًا"}
            </p>
            <button
              type="button"
              className="cart-item-remove cart-item-remove--text"
              onClick={() => onRemove(item.id)}
            >
              <FiTrash2 /> إزالة من السلة
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CartItem;

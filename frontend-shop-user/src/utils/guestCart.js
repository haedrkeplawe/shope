// user
/*
  utils/guestCart.js
  ------------------------------------------------------------------
  سلة الزائر (بدون تسجيل دخول) - عايشة بالكامل بـ localStorage المتصفح،
  صفر اعتماد على السيرفر لتخزينها (نفس فلسفة "بدون حالة مشتقة مخزّنة"
  المتبعة بكل النظام - هون التخزين نفسه مؤقت ومحلي بطبيعته أصلاً).
  التسعير الحقيقي (بعد العروض) بيجي دايمًا لحظيًا من السيرفر
  (POST /shop/cart/preview) - هاد الملف بس بدارة القراءة/الكتابة
  المحلية للبنود الخام (منتج + مقاس + لون + كمية)، بنفس منطق مطابقة
  السطر (منتج+مقاس+لون → زيادة الكمية، وإلا سطر جديد) المستخدم بالباك
  اند بالضبط (controllers/customer.controller.js → addToCart)

  ⚠️ لحظة ما الزائر يسجّل دخول (أو يعمل حساب جديد وينجح تسجيل دخوله)،
  هاي السلة بتنتقل لحسابه الحقيقي (POST /customers/cart/merge) وبعدها
  بتتمسح من هون نهائيًا - شوف context/CartContext.jsx → mergeGuestCart
*/

const STORAGE_KEY = "taraz_guest_cart";

const generateLineId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// نفس دالة sameVariant المستخدمة بالباك اند بالضبط (customer.controller.js) -
// null و"" بيتعاملو كنفس الشي (مفيش مقاس/لون مختار)
const sameVariant = (a, b) =>
  (a.size || null) === (b.size || null) &&
  (a.color || null) === (b.color || null);

export const getGuestCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveGuestCart = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    // localStorage مرفوض (مثلاً تصفّح خاص ببعض المتصفحات) - السلة بتضل
    // بالذاكرة لهاي الجلسة بس، بلا ما نكسر التجربة بخطأ ظاهر للزبون
  }
};

export const getGuestCartCount = () =>
  getGuestCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

/*
  إضافة/زيادة بند بسلة الزائر - بترجع السلة الكاملة بعد التعديل (عشان
  الطرف المنادي يقدر يحسب العدّاد الجديد فورًا بدون قراءة تانية)
*/
export const addGuestCartItem = (
  productId,
  { size = null, color = null, quantity = 1 } = {},
) => {
  const items = getGuestCart();
  const normalizedSize = size || null;
  const normalizedColor = color || null;
  const requestedQty = Math.max(1, Number(quantity) || 1);

  const existing = items.find(
    (item) =>
      item.productId === productId &&
      sameVariant(item, { size: normalizedSize, color: normalizedColor }),
  );

  if (existing) {
    existing.quantity += requestedQty;
  } else {
    items.push({
      lineId: generateLineId(),
      productId,
      size: normalizedSize,
      color: normalizedColor,
      quantity: requestedQty,
    });
  }

  saveGuestCart(items);
  return items;
};

export const updateGuestCartItemQuantity = (lineId, quantity) => {
  const items = getGuestCart();
  const line = items.find((item) => item.lineId === lineId);
  if (line) {
    line.quantity = Math.max(1, Number(quantity) || 1);
    saveGuestCart(items);
  }
  return items;
};

export const removeGuestCartItem = (lineId) => {
  const items = getGuestCart().filter((item) => item.lineId !== lineId);
  saveGuestCart(items);
  return items;
};

export const clearGuestCart = () => {
  saveGuestCart([]);
};

/*
  بعد أي معاينة لحظية من السيرفر (POST /shop/cart/preview)، بنزامن السلة
  المحلية مع النتيجة الحقيقية: بنشيل أي سطر منتجه اتحذف نهائيًا (نفس
  فلسفة needsPersist/persistCart بالباك اند بالضبط)، وبنثبّت أي كمية
  عدّلها السيرفر (تخطّت المخزون الفعلي المتاح) - عشان السلة المحلية تضل
  دايمًا مرآة صادقة للواقع، بدل ما تصير "كاذبة" بعد أول تعديل تلقائي
*/
export const reconcileGuestCart = (serverItems = []) => {
  const byLineId = {};
  serverItems.forEach((item) => {
    byLineId[item.id] = item;
  });

  const items = getGuestCart().filter((item) => {
    const match = byLineId[item.lineId];
    return !match || match.unavailableReason !== "not_found";
  });

  items.forEach((item) => {
    const match = byLineId[item.lineId];
    if (match && match.available) {
      item.quantity = match.quantity;
    }
  });

  saveGuestCart(items);
  return items;
};

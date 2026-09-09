# Flutter Integration Guide — v2.2 نظام العروض

> **الجمهور المستهدف:** فريق Flutter (تطبيق المستخدم)  
> **الإصدار:** v2.2  
> **الموضوع:** نظام العروض (خصم + توصيل مجاني)  
> **ملفات الباك المعدّلة:** `user_controller.js`, `user_socket.js`, `user_routes.js`, `Cart.js`, `Order.js`

---

## نظرة عامة

الباك الآن يدعم نوعين من العروض على الأطعمة:

| النوع | الوصف |
|---|---|
| `discount` | خصم بالنسبة المئوية يُطبَّق على سعر الطعام تلقائياً |
| `free_delivery` | توصيل مجاني للطلب كاملاً لما يكون هذا الطعام في السلة |

العروض **يضيفها الأدمن فقط** من لوحة التحكم. لكل عرض تاريخ بداية ونهاية، ويمكن تحديده لبلد معين (`SY` أو `DE` أو `ALL`).

**نقطة مهمة جداً:** إذا ما كان في عروض على الطعام، كل شي يشتغل بنفس الطريقة القديمة تماماً. **ما في أي تغيير يكسر الكود الحالي.**

---

## 1. Endpoint جديد — صفحة العروض

```
GET /api/user/promotions
Authorization: Bearer <token>
```

استخدم هذا الـ endpoint لبناء شاشة عروض مستقلة تعرض كل العروض النشطة حالياً.

**شكل الرد:**
```json
{
  "success": true,
  "promotions": [
    {
      "_id": "...",
      "type": "discount",
      "discountValue": 30,
      "startDate": "2026-06-01T00:00:00.000Z",
      "endDate": "2026-06-30T00:00:00.000Z",
      "country": "SY",
      "foodId": {
        "_id": "...",
        "name": "بيتزا مارغريتا",
        "image": { "url": "https://..." },
        "price": 5000,
        "sizes": [
          { "name": "small", "price": 3000 },
          { "name": "medium", "price": 5000 },
          { "name": "large", "price": 7000 }
        ],
        "rating": 4.5,
        "restaurantId": {
          "name": "...",
          "image": { "url": "https://..." }
        }
      }
    },
    {
      "_id": "...",
      "type": "free_delivery",
      "discountValue": null,
      "endDate": "2026-06-30T00:00:00.000Z",
      "country": "ALL",
      "foodId": { ... }
    }
  ]
}
```

**ملاحظات مهمة:**
- الرد يعرض العروض النشطة **الآن فقط** والمناسبة لبلد المستخدم
- `discountValue` يكون `null` لو النوع `free_delivery`
- الفلترة بالبلد تصير في الباك — Flutter ما يحتاج يفلتر

---

## 2. تغيير على رد تفاصيل الطعام

**`GET /api/user/food/:id`** صار يرجع مصفوفة `promotions` مع كل طعام.

**قبل v2.2:**
```json
{
  "food": {
    "_id": "...",
    "name": "بيتزا",
    "price": 5000
  }
}
```

**بعد v2.2:**
```json
{
  "food": {
    "_id": "...",
    "name": "بيتزا",
    "price": 5000,
    "promotions": [
      {
        "_id": "...",
        "type": "discount",
        "discountValue": 30,
        "endDate": "2026-06-30T00:00:00.000Z"
      },
      {
        "_id": "...",
        "type": "free_delivery",
        "endDate": "2026-06-30T00:00:00.000Z"
      }
    ]
  }
}
```

**إذا ما في عروض:** `"promotions": []` — تعامل معها بشكل طبيعي وما تعرض أي badge.

---

## 3. تغيير على رد قائمة المطعم

**`GET /api/user/food-in-restaurant/:id`** صار يرجع `promotions[]` مع كل طعام.

**قبل v2.2:**
```json
{
  "foods": [
    { "_id": "...", "name": "بيتزا", "price": 5000 }
  ]
}
```

**بعد v2.2:**
```json
{
  "foods": [
    {
      "_id": "...",
      "name": "بيتزا",
      "price": 5000,
      "promotions": [
        {
          "type": "discount",
          "discountValue": 30,
          "endDate": "2026-06-30T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

**استخدم هذا لعرض badge الخصم على كروت الطعام في قائمة المطعم.**

---

## 4. تغيير على رد إضافة للسلة

**`POST /api/user/cart`** — جسم الطلب ما تغير. أرسل نفس الـ body القديم.

**رد السلة** صار يحتوي على حقول جديدة:

### حقول جديدة في كل عنصر بالسلة:
```json
{
  "items": [
    {
      "foodId": "...",
      "name": "بيتزا",
      "basePrice": 3500,
      "originalPrice": 5000,
      "promotionId": "...",
      "quantity": 1,
      "totalItemPrice": 3500
    }
  ]
}
```

| الحقل | متى يكون موجود | الشرح |
|---|---|---|
| `basePrice` | دائماً | السعر الفعلي اللي يدفعه المستخدم (بعد الخصم لو في) |
| `originalPrice` | فقط لو في خصم | السعر الأصلي قبل الخصم — اعرضه مشطوباً |
| `promotionId` | فقط لو في خصم | معرف العرض المطبق |

### حقول جديدة في جذر السلة:
```json
{
  "hasFreeDelivery": true,
  "freeDeliveryPromotionId": "..."
}
```

| الحقل | الشرح |
|---|---|
| `hasFreeDelivery` | `true` لو في طعام في السلة عليه عرض توصيل مجاني |
| `freeDeliveryPromotionId` | للباك فقط — Flutter ما يحتاج يبعته |

**توصيات للـ UI:**
- اعرض `originalPrice` مشطوباً لما يكون قيمته مختلفة عن `null`
- اعرض badge "توصيل مجاني" في ملخص السلة لما يكون `hasFreeDelivery: true`

---

## 5. تغيير على رد إنشاء الأوردر

**`POST /api/user/order`** — جسم الطلب ما تغير.

لو كان `hasFreeDelivery: true` في السلة والعرض لا يزال نشطاً، رد الأوردر سيكون:

```json
{
  "order": {
    "deliveryFee": 0,
    "itemsPrice": 5000,
    "totalPrice": 5000
  }
}
```

**UI:** اعرض "مجاني" أو "Free" بدل قيمة التوصيل في شاشة ملخص الطلب.

---

## 6. حدث Socket جديد — مهم جداً ⚠️

### `order:promotionExpired`

هذا الحدث يُرسَل من الباك **أثناء `order:send`** إذا انتهت صلاحية أي عرض بين وقت إضافة الطعام للسلة ووقت إرسال الطلب.

**لما يصير هيك:**
- الأوردر يبقى بحالة `not_confirmed`
- السلة **لا تُحذف** — المستخدم يقدر يراجعها
- لازم تبلّغ المستخدم ويراجع سلته من جديد

**شكل الـ payload:**
```json
{
  "message": "Some promotions have expired. Please review your cart and try again.",
  "changes": [
    {
      "foodName": "بيتزا مارغريتا",
      "type": "discount"
    },
    {
      "type": "free_delivery"
    }
  ]
}
```

**التطبيق في Flutter — مطلوب:**
```dart
socket.on("order:promotionExpired", (data) {
  // 1. اعرض dialog أو snackbar يخبر المستخدم
  // 2. ارجع لشاشة السلة — الأسعار ممكن تكون تغيرت
  // 3. لا تكمل عملية الدفع

  final changes = data["changes"] as List;
  for (final change in changes) {
    if (change["type"] == "discount") {
      // "انتهى عرض الخصم على '${change['foodName']}'"
    } else if (change["type"] == "free_delivery") {
      // "انتهى عرض التوصيل المجاني"
    }
  }
});
```

**إذا ما طبّقت هذا الـ listener:**
المستخدم يضغط "إرسال الطلب" ولا شي يصير — لا تأكيد، لا خطأ، الطلب يبقى معلق بصمت.

---

## 7. ما الذي لم يتغير

هذه الأشياء لم تتغير إطلاقاً — Flutter ما يحتاج يعدّل عليها:

- جسم طلب `order:send` — نفس الـ payload القديم
- `order:confirmDelivery` — نفس الطريقة
- كل endpoints التسجيل والدخول
- إدارة العناوين
- نظام التقييم
- تطبيق السائق — ما في أي تغيير
- لوحة المطعم — ما في أي تغيير

---

## 8. ملخص — شو يحتاج Flutter يعمله

| الأولوية | المهمة | مطلوب؟ |
|---|---|---|
| 🔴 حرج | إضافة listener لـ `order:promotionExpired` | **نعم** |
| 🔴 حرج | عرض `originalPrice` مشطوباً في السلة لما يكون مش `null` | **نعم** |
| 🔴 حرج | عرض badge "توصيل مجاني" لما يكون `hasFreeDelivery: true` | **نعم** |
| 🟡 مهم | عرض badge الخصم على كروت الطعام من `promotions[]` | موصى به |
| 🟡 مهم | عرض `deliveryFee: 0` كـ "مجاني" في ملخص الطلب | موصى به |
| 🟢 اختياري | بناء شاشة عروض من `GET /user/promotions` | اختياري |

---

## 9. سيناريو بدون عروض — التوافق مع النسخة القديمة

إذا الطعام **ما عنده عروض نشطة**، كل شي يشتغل بنفس طريقة v2.1:

- `promotions: []` في رد الطعام — ما تعرض شي
- `originalPrice: null` في عنصر السلة — اعرض `basePrice` بشكل طبيعي
- `hasFreeDelivery: false` في السلة — ما في badge
- `deliveryFee` بالقيمة الاعتيادية — اعرضه بشكل طبيعي
- `order:promotionExpired` ما يُرسَل أبداً — ما في حاجة لأي action

**ما في أي تغيير يكسر الـ flows الحالية بدون عروض.**

---

## 10. مرجع سريع — أشكال الـ Response

### عنصر سلة بخصم:
```json
{
  "basePrice": 3500,
  "originalPrice": 5000,
  "promotionId": "abc123"
}
```

### عنصر سلة بدون عرض:
```json
{
  "basePrice": 5000,
  "originalPrice": null,
  "promotionId": null
}
```

### سلة بتوصيل مجاني:
```json
{
  "hasFreeDelivery": true,
  "freeDeliveryPromotionId": "xyz789"
}
```

### سلة بدون توصيل مجاني:
```json
{
  "hasFreeDelivery": false,
  "freeDeliveryPromotionId": null
}
```

### أوردر بتوصيل مجاني:
```json
{
  "deliveryFee": 0,
  "itemsPrice": 5000,
  "totalPrice": 5000
}
```

### أوردر بدون عرض:
```json
{
  "deliveryFee": 1000,
  "itemsPrice": 5000,
  "totalPrice": 6000
}
```
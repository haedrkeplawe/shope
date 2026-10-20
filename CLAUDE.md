# CLAUDE.md

متجر ملابس إلكتروني (البراند: **سبتمبر** بالعربي / **September** بالإنكليزي — كان اسمه سابقًا "طراز" / "TARAZ") — مكوّن من باك إند واحد وواجهتين React.
الواجهات بالعربي بالكامل (`dir="rtl"`)، وما في i18n فعلي رغم وجود المكتبة.

## بنية المشروع

| المجلد | الدور | التشغيل |
|---|---|---|
| `backend-shop/` | API — Express 5 + Mongoose 9 + Cloudinary + JWT (كوكيز) | `npm run watch` (nodemon) أو `npm start` — بورت 4000 |
| `frontend-shop/` | لوحة تحكم الأدمن/المالك والموظفين | `npm start` — بورت 3000 |
| `frontend-shop-user/` | موقع الزبون (تصفح، سلة، طلبات، عضوية، مسوّق) | `npm start` — بورت 3001 |

- النشر على Render: `shope-z9xu.onrender.com` (أدمن) و`shope-user.onrender.com` (زبون). أي دومين جديد لازم ينضاف لـ `cors` بـ `backend-shop/server.js`.
- ما في git ولا tests حاليًا.
- `backend-shop/READMEv2.2.md` من مشروع قديم (توصيل أكل/Flutter) — **مش مرجع لهاد المشروع، تجاهله**.

## الباك إند

- البنية: `routes/` ← `controllers/` ← `models/`، والمنطق المشترك بـ `utils/*Engine.js` (coupon, shipping, membership, marketer, notification, orderStatus) و`utils/serialize*.js` لتشكيل الردود.
- `server.js` بيعمل seed/backfill بعد الاتصال بالداتابيس (`utils/seedDefaults.js`).
- الرسائل للمستخدم بالعربي: `res.status(4xx).json({ message: "..." })`، وخطأ السيرفر `{ message: "حدث خطأ في السيرفر" }`.

### المصادقة والصلاحيات
- **جلستين منفصلتين بالكوكيز:** `storeToken` للأدمن (`middleware/verifyStore.js` ← `req.storeAuth = { id, role }`، والـ role إما `"store"` للمالك أو موظف) و`customerToken` للزبون (`middleware/verifyCustomer.js` ← `req.customerAuth`).
- `middleware/attachCustomerIfPresent.js` للراوتس العامة اللي بتتصرف بشكل مختلف إذا الزبون مسجل.
- **التفويض** (`middleware/authorize.js`):
  - `requireOwner` للإجراءات الحساسة (إدارة الموظفين، حساب المالك).
  - `requirePermission("key")` بيقرأ صلاحيات الموظف من الداتابيس **بكل طلب** (مقصود — مش من التوكن).
- مفاتيح الصلاحيات مصدرها الوحيد `utils/permissions.js`. لإضافة قسم جديد: ضيف المفتاح + التسمية هناك، ثم `router.use(verifyStore); router.use(requirePermission("key"))` بأول الـ route file. موديل Staff بياخدها تلقائيًا.
- `products` يغطي المنتجات والمخزون معًا (نفس الـ route file).
- **حماية نقاط الدخول:**
  - `middleware/sanitizeInput.js` بيشيل مفاتيح `$...` من `req.body`. مركّب عالمياً، وبعد multer بميدل ويرز الرفع.
  - `requireAuthStrings` بيفرض إنو الحقول الحساسة تكون نصوص.
  - `middleware/rateLimiters.js` فيه حدود على (IP + رقم) وعلى الـ IP لحاله، بسبب CGNAT بسوريا.
  - `utils/otpAttempts.js` بيلغي الرمز بعد 5 محاولات غلط.
  - أي نقطة دخول جديدة لازم تاخد نفس الطبقات. تصفير العدّادات بيكون بـ `0` مو `undefined`، لأنه الحقل `select: false`.

### مسارات الـ API
- أدمن: `/api/store`، `/api/staff`، `/api/categories`، `/api/products`، `/api/advanced-filters`، `/api/offers`، `/api/coupons`، `/api/shipping-zones`، `/api/admin/*` (dashboard, orders, customers, marketers, ratings, reports, favorites, abandoned-carts, memberships).
- زبون: `/api/customers` (حساب، سلة، …)، `/api/shop` (تصفح عام + `shipping-zones` النشطة + `cart/preview`)، `/api/orders`، `/api/notifications`.

### مفاهيم عمل مهمة
- **العروض (Deals/offers)** على مستوى المنتج (`utils/applyOffers.js`)، و**الكوبونات** على مجموع الطلب — بيتراكموا عادي.
- التسعير النهائي دايمًا بيتحسب بالسيرفر لحظيًا، ما في أسعار مشتقة مخزّنة.
- الصور على Cloudinary (رابط كامل)، مع دعم قديم لمسارات `/uploads/...` المحلية.

## الفرونت إند (الاثنين)

- CRA + React 19 + react-router 7. استدعاء الـ API بـ **`fetch`** مع `credentials: "include"` و`API_URL` من `src/config/api.js` (مش axios)، والصور عبر `getImageUrl()`.
- الإشعارات بـ `react-hot-toast` ورسائل عربية: `toast.error(result.message || "تعذر ...")`، وفشل الشبكة `"تعذر الاتصال بالسيرفر"`.
- الستايل: ملف CSS عادي لكل صفحة/قسم بـ `src/css/` (ما في Tailwind ولا CSS modules).
- ملفات `frontend-shop-user` بتبدأ بتعليق `// user`.
- **السكرول وقت التنقّل** مسؤولية `components/ScrollManager.jsx` بس (موجود بالمشروعين، نسختين متطابقتين، ومركّب بـ `App.js`): الصفحة الجديدة بتبلّش من فوق، والرجوع بيرجّع نفس المكان، و`REPLACE` بنفس المسار ما بيحرّك السكرول. **لا تحط `window.scrollTo(0, 0)` وقت تحميل الصفحات**، لأنه بيخرّب الرجوع لنفس المكان. مسموح بس لتغيير داخلي بنفس الصفحة، متل خطوات الـ Checkout.

### لوحة الأدمن (`frontend-shop`)
- كل صفحة بـ `App.js` ملفوفة بـ `<RequirePermission permissionKey="...">` (أو `ownerOnly`).
- القائمة الجانبية من `src/constants/navItems.js`. الصفحة الجديدة: ضيف الـ Route وضيف مسارها لـ `IMPLEMENTED_PATHS`، وإلا بتنعرض `PagePlaceholder`.

### موقع الزبون (`frontend-shop-user`)
- التصفح والسلة عامة بدون تسجيل دخول. أما الحساب والـ checkout والطلبات والمفضلة والإشعارات فهي تحت `ProtectedRoute`.
- سلة الزائر بـ localStorage (`utils/guestCart.js`، المفتاح `taraz_guest_cart`)، وبتندمج بحساب الزبون بعد تسجيل الدخول (`/customers/cart/merge` عبر `CartContext`).
- `Shop.jsx` نفس المكوّن لـ `/shop` و`/brands` و`/new` و`/offers`، بـ `preset` و`key` مختلفين.
- **البحث كله بصفحة المتجر** (ما في صفحة بحث منفصلة): أيقونة 🔍 بالهيدر بتودّي على `/shop` مع `state.focusSearch` (`getSearchLinkProps` بـ `siteNavItems.js`)، و`/search` بيتحوّل لـ `/shop`. منطق البحث بالباك إند بـ `utils/searchEngine.js` (تطبيع عربي، كلمات متعددة، أسماء الفلاتر الظاهرة، ترتيب `relevance`، و`suggestions` إذا ما في نتائج). عمليات البحث الأخيرة بـ `utils/recentSearches.js`.

## أسلوب الكتابة

- **التعليقات بالعربي، بلهجة شامية/عامية، ومفصّلة**: بتشرح "ليش" القرار مش بس "شو". عادة بأول كل ملف بلوك `/* ... */` بيشرح دوره، و`⚠️` قبل الملاحظات المهمة. حافظ على نفس الأسلوب.
- **النصوص اللي بيشوفها المستخدم** (واجهة، toast، رسائل API، إشعارات) لازم تكون **بالعربية الفصحى**، مش بالعامية. التعليقات بالكود بس هي اللي بتضل بالعامية. انتبه كمان: "نفدت الكمية" بالدال، مش "نفذت".
- لا تلمس ملفات `.env`.
- اسم البراند: بالنص العربي اكتب "سبتمبر"، وبالنص الإنكليزي "September". **لا تجمعهم سوا** (مثل "سبتمبر / September") إلا إذا كان مكتوب هيك أصلاً.

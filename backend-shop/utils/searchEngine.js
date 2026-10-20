// user
const Category = require("../models/category");
const AdvancedFilter = require("../models/advancedFilter");

/*
  utils/searchEngine.js
  ------------------------------------------------------------------
  محرك البحث بصفحة المتجر (GET /api/shop/products?search=...) - كل منطق
  البحث بمكان واحد بدل ما يكون regex وحيد جوّا الكنترولر

  شو بيعمل:
  1) تطبيع النص العربي (normalizeArabic): أ/إ/آ/ٱ → ا، ة → ه، ى/ئ → ي،
     ؤ → و، وبيشيل التشكيل والتطويل (ـ) - هيك "سهره" = "سهرة" و"اسود" = "أسود"
  2) تقسيم البحث لكلمات (tokenize): كل كلمة لازم تنلاقى بمكان ما بالمنتج
     (AND بين الكلمات، OR بين الحقول) - يعني "فستان أسود" بيلاقي "فستان
     سهرة أسود" حتى لو الكلمتين مش جنب بعض
  3) البحث بالأسماء الظاهرة للزبون: البراند/اللون/الجنس/... محفوظين
     بالمنتج كـ"مفاتيح" داخلية (مثلاً brand: "zara")، والزبون بيكتب الاسم
     الظاهر ("زارا") - فمنحوّل الكلمة لكل المفاتيح يلي تسميتها بتطابقها
     (من AdvancedFilter.values) قبل الاستعلام
  4) البحث باسم الفئة (مع فئاتها الفرعية لو كانت قسم رئيسي)
  5) ترتيب "الأكثر صلة" (scoreProduct) - بيصير بالذاكرة متل باقي أنواع
     الترتيب بـ shop.controller (لأنه الفرز كله أصلاً بالذاكرة هناك)

  ⚠️ الـ regex يلي بيروح لـ Mongo مبني من حروف حرفية (مش \uXXXX) لأنه
  محرك PCRE تبع Mongo ما بيفهم صيغة \u تبع جافاسكريبت
*/

// حدود حماية - بحث أطول من هيك ما إله معنى عملي وبيثقّل الاستعلام
const MAX_QUERY_LENGTH = 100;
const MAX_TOKENS = 6;

// التشكيل (فتحة، ضمة، كسرة، تنوين، شدة، سكون، ألف خنجرية) + التطويل
const DIACRITICS_CHARS = Array.from({ length: 0x0652 - 0x064b + 1 }, (_, i) =>
  String.fromCharCode(0x064b + i),
).join("") + String.fromCharCode(0x0670, 0x0640);
const DIACRITICS_REGEX = new RegExp(`[${DIACRITICS_CHARS}]`, "g");
// بين كل حرفين بالـ regex منسمح بأي تشكيل اختياري - عشان كلمة مكتوبة
// بالداتابيس مع تشكيل ("فُستان") تنلاقى ببحث بدون تشكيل ("فستان")
const OPTIONAL_DIACRITICS = `[${DIACRITICS_CHARS}]*`;

// كل حرف "مطبّع" مقابل كل أشكاله المحتملة بالنص الأصلي المخزّن
const ARABIC_VARIANTS = {
  ا: "اأإآٱ",
  ه: "هة",
  ي: "يىئ",
  و: "وؤ",
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeArabic = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(DIACRITICS_REGEX, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, " ")
    .trim();

// تقسيم البحث لكلمات فريدة (بعد التطبيع) - الفواصل وعلامات الترقيم
// بتعتبر مسافات، والكلمات المكررة بتنحذف
const tokenize = (query) => {
  const normalized = normalizeArabic(
    String(query || "").slice(0, MAX_QUERY_LENGTH),
  );
  const words = normalized
    .split(/[\s,،.؛;:!؟?/\\|()[\]{}"'«»\-_+]+/)
    .filter(Boolean);
  return [...new Set(words)].slice(0, MAX_TOKENS);
};

// regex لكلمة وحدة مطبّعة، بيطابق كل أشكالها الأصلية بالنص المخزّن
const buildTokenRegex = (token) => {
  const pattern = [...token]
    .map((ch) => {
      const variants = ARABIC_VARIANTS[ch];
      return variants ? `[${variants}]` : escapeRegex(ch);
    })
    .join(OPTIONAL_DIACRITICS);
  return new RegExp(pattern, "i");
};

// الفلاتر يلي منبحث بأسمائها الظاهرة (key بموديل AdvancedFilter)
const LABEL_SEARCH_FILTER_KEYS = [
  "brand",
  "color",
  "gender",
  "piece_type",
  "season",
  "condition",
  "fabric_type",
];

/*
  تحضير سياق البحث - طلبين بس للداتابيس (الفئات + تعريفات الفلاتر) بغض
  النظر عن عدد الكلمات. بيرجع null لو ما في بحث فعلي (نص فاضي/رموز بس)

  - strictConditions: شروط Mongo (كل كلمة لازم تتطابق) → للنتائج الأساسية
  - looseCondition: شرط Mongo (أي كلمة تتطابق) → لاقتراحات "ما في نتائج"
  - phrase / tokens / tokenMatches: للاستخدام بحساب الصلة (scoreProduct)
*/
const prepareSearch = async (rawQuery) => {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return null;

  const [categories, filterDefs] = await Promise.all([
    Category.find({ status: "active" }).select("name parentId").lean(),
    AdvancedFilter.find({ key: { $in: LABEL_SEARCH_FILTER_KEYS } })
      .select("key productField values")
      .lean(),
  ]);

  const normalizedCategories = categories.map((c) => ({
    id: String(c._id),
    parentId: c.parentId ? String(c.parentId) : null,
    name: normalizeArabic(c.name),
  }));

  const tokenMatches = tokens.map((token) => {
    // الفئات المطابقة + فئاتها الفرعية (لو كانت قسم رئيسي)
    const categoryIds = new Set();
    normalizedCategories.forEach((c) => {
      if (!c.name.includes(token)) return;
      categoryIds.add(c.id);
      if (!c.parentId) {
        normalizedCategories
          .filter((sub) => sub.parentId === c.id)
          .forEach((sub) => categoryIds.add(sub.id));
      }
    });

    // قيم الفلاتر يلي تسميتها (أو قيمتها الداخلية) بتطابق الكلمة،
    // مجمّعة حسب حقل المنتج المرتبط (brand, colors, gender...)
    const fieldValues = {};
    filterDefs.forEach((def) => {
      if (!def.productField) return;
      (def.values || []).forEach((v) => {
        if (
          normalizeArabic(v.label).includes(token) ||
          normalizeArabic(v.value).includes(token)
        ) {
          if (!fieldValues[def.productField]) {
            fieldValues[def.productField] = new Set();
          }
          fieldValues[def.productField].add(v.value);
        }
      });
    });

    return { token, regex: buildTokenRegex(token), categoryIds, fieldValues };
  });

  const buildTokenCondition = ({ regex, categoryIds, fieldValues }) => {
    const or = [
      { name: regex },
      { searchTags: regex },
      { shortDescription: regex },
      { sku: regex },
      // البراند ممكن يكون نص حر قديم مش من قائمة الفلتر - منغطيه كمان
      { brand: regex },
    ];
    if (categoryIds.size > 0) {
      or.push({ categoryId: { $in: [...categoryIds] } });
    }
    Object.entries(fieldValues).forEach(([field, values]) => {
      or.push({ [field]: { $in: [...values] } });
    });
    return { $or: or };
  };

  const tokenConditions = tokenMatches.map(buildTokenCondition);

  return {
    tokens,
    phrase: tokens.join(" "),
    tokenMatches,
    strictConditions: tokenConditions,
    looseCondition: { $or: tokenConditions.flatMap((c) => c.$or) },
  };
};

/*
  درجة الصلة لمنتج واحد (رقم أعلى = أقرب) - الأوزان:
  - الاسم مطابق تمامًا للبحث كامل: 100
  - الاسم بيبلّش بالبحث كامل: 60
  - الاسم فيه البحث كامل (متتالي): 40
  - لكل كلمة: بداية كلمة بالاسم 15 / جوّا الاسم 10 / SKU 8 /
    براند-فئة-لون... 6 / كلمات مفتاحية 5 / وصف قصير 2
*/
const scoreProduct = (product, ctx) => {
  const name = normalizeArabic(product.name);
  const nameWords = name.split(" ");
  const tags = (product.searchTags || []).map(normalizeArabic);
  const description = normalizeArabic(product.shortDescription);
  const sku = normalizeArabic(product.sku);
  const categoryId = product.categoryId ? String(product.categoryId) : null;

  let score = 0;

  if (name === ctx.phrase) score += 100;
  else if (name.startsWith(ctx.phrase)) score += 60;
  else if (name.includes(ctx.phrase)) score += 40;

  ctx.tokenMatches.forEach(({ token, categoryIds, fieldValues }) => {
    if (nameWords.some((w) => w.startsWith(token))) score += 15;
    else if (name.includes(token)) score += 10;

    if (sku && sku.includes(token)) score += 8;

    const matchesAttribute =
      (categoryId && categoryIds.has(categoryId)) ||
      Object.entries(fieldValues).some(([field, values]) => {
        const productValue = product[field];
        return Array.isArray(productValue)
          ? productValue.some((v) => values.has(v))
          : values.has(productValue);
      });
    if (matchesAttribute) score += 6;

    if (tags.some((t) => t.includes(token))) score += 5;
    if (description.includes(token)) score += 2;
  });

  return score;
};

// ترتيب حسب الصلة، والتعادل بيتحسم بالأحدث
const sortByRelevance = (products, ctx) =>
  products
    .map((p) => ({ p, score: scoreProduct(p, ctx) }))
    .sort(
      (a, b) =>
        b.score - a.score || new Date(b.p.createdAt) - new Date(a.p.createdAt),
    )
    .map(({ p }) => p);

module.exports = {
  normalizeArabic,
  tokenize,
  prepareSearch,
  sortByRelevance,
};

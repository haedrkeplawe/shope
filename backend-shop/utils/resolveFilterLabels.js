const AdvancedFilter = require("../models/advancedFilter");

/*
  utils/resolveFilterLabels.js
  ------------------------------------------------------------------
  بيترجم القيمة الداخلية المخزّنة بالمنتج (value) للـ label الحقيقي
  يلي المفروض يظهر للزبون - القيمة والـ label مخزنين سوا جوا كل عنصر
  بمصفوفة "values" بموديل AdvancedFilter (شوف filterValueSchema)

  ليش لازم هالخطوة:
  - المنتج (Product) بيخزن بس القيمة الداخلية (مثال: condition = "excellent")
  - الـ label الحقيقي يلي المفروض يشوفه الزبون (مثال: "ممتاز") مخزّن بمكان
    تاني تمامًا: AdvancedFilter.values[].label
  - لو رجّعنا القيمة الداخلية زي ما هي لواجهة المتجر، بيطلع نص غلط
    (إنجليزي/كود داخلي) بدل اسم العرض الفعلي

  الاستخدام:
    const conditionMap = await buildLabelMap("condition");
    const label = conditionMap[rawValue] || rawValue; // fallback للقيمة الخام لو مش لاقي ترجمة
*/

/*
  بيبني خريطة value → label لفلتر واحد بمفتاحه (key)
  بيرجع {} لو الفلتر مش موجود أو ملوش قيم أصلاً
*/
const buildLabelMap = async (filterKey) => {
  const filter = await AdvancedFilter.findOne({ key: filterKey });
  if (!filter) return {};

  const map = {};
  filter.values.forEach((v) => {
    map[v.value] = v.label;
  });
  return map;
};

/*
  بيبني خرائط الترجمة لأكتر من فلتر مرة وحدة (أسرع من استدعاء buildLabelMap
  بشكل منفصل لكل فلتر) - بيرجع { condition: {...}, brand: {...} }
*/
const buildLabelMaps = async (filterKeys) => {
  const filters = await AdvancedFilter.find({ key: { $in: filterKeys } });

  const maps = {};
  filterKeys.forEach((key) => (maps[key] = {}));

  filters.forEach((filter) => {
    filter.values.forEach((v) => {
      maps[filter.key][v.value] = v.label;
    });
  });

  return maps;
};

/*
  بيرجع الـ label المقابل لقيمة معينة من خريطة جاهزة، مع fallback للقيمة
  الخام نفسها لو ما لقاش ترجمة (عشان الموقع ما ينكسر لو فيه قيمة قديمة
  اتحذفت من الفلتر بالأدمن)
*/
const resolveLabel = (map, rawValue) => {
  if (!rawValue) return rawValue;
  return map?.[rawValue] || rawValue;
};

module.exports = { buildLabelMap, buildLabelMaps, resolveLabel };

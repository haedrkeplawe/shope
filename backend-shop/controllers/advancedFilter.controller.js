const AdvancedFilter = require("../models/advancedFilter");
const Product = require("../models/product");

/*
  حقول من نوع Boolean بموديل Product (فلاتر النظام: حالة التخفيض، للأعضاء فقط)
  - لازم تتعامل معاها بشكل مختلف عن باقي الحقول، لأن مونجوز مش عارف يحوّل ""
    لـ Boolean، فلو استخدمنا $nin: [null, "", undefined] عليها بيرمي CastError
*/
const BOOLEAN_PRODUCT_FIELDS = ["discountEnabled", "membersOnly"];
// "price" حقل رقمي مطلوب (required) بموديل Product، يعني دايمًا متعبّى -
// فمش محتاج نفحص إنه فاضي أصلًا، وبنتجنب كمان مشكلة كاست "" على حقل Number
const NUMERIC_PRODUCT_FIELDS = ["price"];

/*
  حساب عدد المنتجات اللي بتستخدم فلتر معيّن (بغض النظر عن القيمة)
  - لو الحقل Boolean: بنعد المنتجات اللي قيمته true بس (يعني "مستخدم" فعليًا)
  - لو الحقل رقمي (زي price): بنعد كل المنتجات لأنه حقل مطلوب دايمًا متعبّى
  - لو الفلتر multi-value (زي الألوان): بنتأكد إن المصفوفة مش فاضية
  - لو single-value نصي عادي: بنتأكد إن الحقل موجود ومش فاضي
*/
const countProductsForField = async (productField, isMultiValue) => {
  if (!productField) return 0;

  if (BOOLEAN_PRODUCT_FIELDS.includes(productField)) {
    return Product.countDocuments({ [productField]: true });
  }

  if (NUMERIC_PRODUCT_FIELDS.includes(productField)) {
    return Product.countDocuments({});
  }

  const condition = isMultiValue
    ? { [productField]: { $exists: true, $ne: [] } }
    : { [productField]: { $nin: [null, "", undefined] } };
  return Product.countDocuments(condition);
};

/*
  حساب عدد المنتجات المستخدمة لكل قيمة داخل فلتر واحد
*/
const countUsagePerValue = async (filter) => {
  if (!filter.productField || filter.valueType !== "list") return {};

  const usage = {};
  await Promise.all(
    filter.values.map(async (v) => {
      const condition = { [filter.productField]: v.value };
      usage[v._id.toString()] = await Product.countDocuments(condition);
    }),
  );
  return usage;
};

/*
  جلب كل الفلاتر مع الإحصائيات - لصفحة "إدارة الفلاتر المتقدمة"
  GET /api/advanced-filters/overview
*/
exports.getOverview = async (req, res) => {
  try {
    const filters = await AdvancedFilter.find({}).sort({ order: 1 });

    const filtersWithCounts = await Promise.all(
      filters.map(async (f) => {
        const productsCount = await countProductsForField(
          f.productField,
          f.isMultiValue,
        );
        return {
          id: f._id,
          key: f.key,
          displayName: f.displayName,
          productField: f.productField,
          isMultiValue: f.isMultiValue,
          valueType: f.valueType,
          level: f.level,
          order: f.order,
          active: f.active,
          searchable: f.searchable,
          showOnDesktop: f.showOnDesktop,
          showOnMobile: f.showOnMobile,
          values: f.values
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((v) => ({
              id: v._id,
              value: v.value,
              label: v.label,
              colorHex: v.colorHex,
              active: v.active,
              order: v.order,
            })),
          valuesCount: f.values.length,
          activeValuesCount: f.values.filter((v) => v.active).length,
          productsCount,
        };
      }),
    );

    const stats = {
      totalFilters: filters.length,
      activeFilters: filters.filter((f) => f.active).length,
      basicFilters: filters.filter((f) => f.level === "basic").length,
      advancedFilters: filters.filter((f) => f.level === "advanced").length,
    };

    return res.status(200).json({ stats, filters: filtersWithCounts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب فلتر واحد بالتفصيل + عدد المنتجات لكل قيمة (لمودال "تعديل الفلتر")
  GET /api/advanced-filters/:id
*/
exports.getFilterById = async (req, res) => {
  try {
    const filter = await AdvancedFilter.findById(req.params.id);
    if (!filter) {
      return res.status(404).json({ message: "الفلتر غير موجود" });
    }

    const usage = await countUsagePerValue(filter);

    return res.status(200).json({
      filter: {
        id: filter._id,
        key: filter.key,
        displayName: filter.displayName,
        productField: filter.productField,
        isMultiValue: filter.isMultiValue,
        valueType: filter.valueType,
        level: filter.level,
        order: filter.order,
        active: filter.active,
        searchable: filter.searchable,
        showOnDesktop: filter.showOnDesktop,
        showOnMobile: filter.showOnMobile,
        values: filter.values
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((v) => ({
            id: v._id,
            value: v.value,
            label: v.label,
            colorHex: v.colorHex,
            active: v.active,
            order: v.order,
            productsCount: usage[v._id.toString()] || 0,
          })),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب القيم النشطة بس لفلتر معيّن - بيُستخدم من فورم إضافة/تعديل المنتج
  ومن فلاتر صفحة المنتجات، عشان يملوا الخيارات ديناميكيًا
  GET /api/advanced-filters/:key/values
*/
exports.getActiveValuesByKey = async (req, res) => {
  try {
    const filter = await AdvancedFilter.findOne({ key: req.params.key });
    if (!filter) {
      return res.status(200).json({ values: [] });
    }

    const values = filter.values
      .filter((v) => v.active)
      .sort((a, b) => a.order - b.order)
      .map((v) => ({
        value: v.value,
        label: v.label,
        colorHex: v.colorHex,
      }));

    return res.status(200).json({ values });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل إعدادات عرض الفلتر نفسه (مش القيم) - اسم العرض، المستوى، الترتيب،
  قابل للبحث، يظهر بالكمبيوتر/الموبايل
  PATCH /api/advanced-filters/:id
  ملاحظة: مينفعش نعدّل key أو productField أو valueType أو isMultiValue -
  دول ثوابت بيحددها الكود فقط
*/
exports.updateFilterSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      level,
      order,
      searchable,
      showOnDesktop,
      showOnMobile,
    } = req.body;

    const filter = await AdvancedFilter.findById(id);
    if (!filter) {
      return res.status(404).json({ message: "الفلتر غير موجود" });
    }

    if (displayName !== undefined) filter.displayName = displayName;
    if (level !== undefined) filter.level = level;
    if (order !== undefined) filter.order = order;
    if (searchable !== undefined) filter.searchable = searchable;
    if (showOnDesktop !== undefined) filter.showOnDesktop = showOnDesktop;
    if (showOnMobile !== undefined) filter.showOnMobile = showOnMobile;

    await filter.save();

    return res
      .status(200)
      .json({ message: "تم تحديث إعدادات الفلتر بنجاح", filter });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تفعيل/إخفاء الفلتر بسرعة (إظهاره أو إخفاؤه عند المستخدم بالمتجر فقط)
  PATCH /api/advanced-filters/:id/status
*/
exports.updateFilterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const filter = await AdvancedFilter.findByIdAndUpdate(
      id,
      { active: Boolean(active) },
      { new: true },
    );

    if (!filter) {
      return res.status(404).json({ message: "الفلتر غير موجود" });
    }

    return res
      .status(200)
      .json({ message: "تم تحديث حالة الفلتر بنجاح", filter });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إضافة قيمة جديدة داخل فلتر (مثال: إضافة لون جديد "كحلي" داخل فلتر اللون)
  POST /api/advanced-filters/:id/values
*/
exports.addFilterValue = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, colorHex, order } = req.body;

    if (!value || !label) {
      return res
        .status(400)
        .json({ message: "القيمة الداخلية واسم العرض مطلوبين" });
    }

    const filter = await AdvancedFilter.findById(id);
    if (!filter) {
      return res.status(404).json({ message: "الفلتر غير موجود" });
    }

    if (filter.valueType !== "list") {
      return res.status(400).json({ message: "هذا الفلتر لا يدعم إضافة قيم" });
    }

    const duplicate = filter.values.some(
      (v) => v.value.toLowerCase() === value.trim().toLowerCase(),
    );
    if (duplicate) {
      return res
        .status(409)
        .json({ message: "هذه القيمة موجودة بالفعل داخل الفلتر" });
    }

    filter.values.push({
      value: value.trim(),
      label: label.trim(),
      colorHex: colorHex || null,
      order: order || filter.values.length + 1,
      active: true,
    });

    await filter.save();

    return res.status(201).json({ message: "تم إضافة القيمة بنجاح", filter });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل قيمة موجودة داخل فلتر
  PATCH /api/advanced-filters/:id/values/:valueId
*/
exports.updateFilterValue = async (req, res) => {
  try {
    const { id, valueId } = req.params;
    const { value, label, colorHex, active, order } = req.body;

    const filter = await AdvancedFilter.findById(id);
    if (!filter) {
      return res.status(404).json({ message: "الفلتر غير موجود" });
    }

    const target = filter.values.id(valueId);
    if (!target) {
      return res.status(404).json({ message: "القيمة غير موجودة" });
    }

    if (value !== undefined) target.value = value.trim();
    if (label !== undefined) target.label = label.trim();
    if (colorHex !== undefined) target.colorHex = colorHex || null;
    if (active !== undefined) target.active = active;
    if (order !== undefined) target.order = order;

    await filter.save();

    return res.status(200).json({ message: "تم تحديث القيمة بنجاح", filter });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف قيمة من داخل فلتر
  DELETE /api/advanced-filters/:id/values/:valueId
*/
exports.deleteFilterValue = async (req, res) => {
  try {
    const { id, valueId } = req.params;

    const filter = await AdvancedFilter.findById(id);
    if (!filter) {
      return res.status(404).json({ message: "الفلتر غير موجود" });
    }

    const target = filter.values.id(valueId);
    if (!target) {
      return res.status(404).json({ message: "القيمة غير موجودة" });
    }

    target.deleteOne();
    await filter.save();

    return res.status(200).json({ message: "تم حذف القيمة بنجاح", filter });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

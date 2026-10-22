const ShippingZone = require("../models/shippingZone");
const { formatDurationLabel } = require("../utils/shippingEngine");

/*
  shippingZone.controller.js (لوحة تحكم الأدمن)
  ------------------------------------------------------------------
  إدارة مناطق الشحن - نفس بنية coupon.controller.js بالضبط (تحقق من
  الحقول، حذف مباشر بدون قيود لأن الطلبات القديمة عندها Snapshot ثابت
  مستقل تمامًا عن المنطقة الحية - نفس فلسفة حذف الكوبون)

  ⚠️ قيد أساسي واحد بيميّز هالكنترولر: نفس المدينة ما بتنقدر تنضاف
  لمنطقتين شحن بنفس الوقت (validateNoCityConflict) - عشان يضل حساب
  السعر لأي مدينة بلا غموض (مصدر حقيقة واحد بالضبط لكل مدينة)
*/

const serializeZone = (zone) => ({
  id: zone._id,
  name: zone.name,
  cities: zone.cities,
  price: zone.price,
  freeShippingThreshold: zone.freeShippingThreshold,
  deliveryDurationMin: zone.deliveryDurationMin,
  deliveryDurationMax: zone.deliveryDurationMax,
  durationLabel: formatDurationLabel(zone),
  isActive: zone.isActive,
  order: zone.order,
  createdAt: zone.createdAt,
});

/*
  تنظيف قائمة المدن المُدخلة: trim + حذف الفاضي + حذف التكرار الداخلي
  (نفس القائمة نفسها) بشكل غير حساس لحالة الأحرف
*/
const normalizeCities = (cities) => {
  if (!Array.isArray(cities)) return [];
  const seen = new Set();
  const result = [];
  cities.forEach((c) => {
    const trimmed = String(c || "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
};

/*
  يتأكد إنه ولا مدينة من القائمة الجديدة موجودة أصلاً بمنطقة شحن تانية
  (باستثناء المنطقة نفسها وقت التعديل) - بيرجع اسم أول مدينة متعارضة
  + اسم المنطقة يلي فيها، أو null لو ما في تعارض
*/
const validateNoCityConflict = async (cities, excludeZoneId = null) => {
  const filter = excludeZoneId ? { _id: { $ne: excludeZoneId } } : {};
  const otherZones = await ShippingZone.find(filter).select("name cities");

  for (const city of cities) {
    const key = city.trim().toLowerCase();
    const conflict = otherZones.find((zone) =>
      zone.cities.some((c) => c.trim().toLowerCase() === key),
    );
    if (conflict) {
      return `مدينة "${city}" مضافة أصلاً بمنطقة "${conflict.name}"`;
    }
  }
  return null;
};

const validateZoneFields = (body) => {
  const { name, price, deliveryDurationMin, deliveryDurationMax } = body;

  if (name !== undefined && !name.trim()) {
    return "اسم منطقة الشحن مطلوب";
  }
  if (price !== undefined && (price === "" || Number(price) < 0)) {
    return "سعر الشحن غير صالح";
  }
  if (
    deliveryDurationMin !== undefined &&
    deliveryDurationMax !== undefined &&
    Number(deliveryDurationMin) > Number(deliveryDurationMax)
  ) {
    return "الحد الأدنى لمدة التوصيل لازم يكون أقل أو يساوي الحد الأقصى";
  }
  if (
    body.freeShippingThreshold !== undefined &&
    body.freeShippingThreshold !== null &&
    body.freeShippingThreshold !== "" &&
    Number(body.freeShippingThreshold) < 0
  ) {
    return "الحد الأدنى للشحن المجاني غير صالح";
  }
  return null;
};

/*
  جلب كل مناطق الشحن + إحصائيات الصفحة دفعة وحدة
  GET /api/shipping-zones
*/
exports.getOverview = async (req, res) => {
  try {
    const zones = await ShippingZone.find({}).sort({ order: 1, createdAt: -1 });
    const serialized = zones.map(serializeZone);

    const stats = {
      totalZones: serialized.length,
      activeZones: serialized.filter((z) => z.isActive).length,
      totalCitiesCovered: serialized.reduce(
        (sum, z) => sum + z.cities.length,
        0,
      ),
    };

    return res.status(200).json({ stats, zones: serialized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب منطقة شحن واحدة (لملء فورم التعديل)
  GET /api/shipping-zones/:id
*/
exports.getZoneById = async (req, res) => {
  try {
    const zone = await ShippingZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: "منطقة الشحن غير موجودة" });
    }
    return res.status(200).json({ zone: serializeZone(zone) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إنشاء منطقة شحن جديدة
  POST /api/shipping-zones
*/
exports.createZone = async (req, res) => {
  try {
    const {
      name,
      cities,
      price,
      freeShippingThreshold,
      deliveryDurationMin,
      deliveryDurationMax,
      order,
    } = req.body;

    if (
      !name?.trim() ||
      price === undefined ||
      price === "" ||
      deliveryDurationMin === undefined ||
      deliveryDurationMin === "" ||
      deliveryDurationMax === undefined ||
      deliveryDurationMax === ""
    ) {
      return res.status(400).json({ message: "كل الحقول الأساسية مطلوبة" });
    }

    const fieldError = validateZoneFields(req.body);
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const normalizedCities = normalizeCities(cities);
    if (normalizedCities.length === 0) {
      return res
        .status(400)
        .json({ message: "لازم تضيف مدينة واحدة على الأقل" });
    }

    const conflictMessage = await validateNoCityConflict(normalizedCities);
    if (conflictMessage) {
      return res.status(409).json({ message: conflictMessage });
    }

    const zone = await ShippingZone.create({
      name: name.trim(),
      cities: normalizedCities,
      price: Number(price),
      freeShippingThreshold:
        freeShippingThreshold === undefined ||
        freeShippingThreshold === null ||
        freeShippingThreshold === ""
          ? null
          : Number(freeShippingThreshold),
      deliveryDurationMin: Number(deliveryDurationMin),
      deliveryDurationMax: Number(deliveryDurationMax),
      order: order ? Number(order) : 1,
    });

    return res.status(201).json({
      message: "تم إنشاء منطقة الشحن بنجاح",
      zone: serializeZone(zone),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل منطقة شحن موجودة
  PATCH /api/shipping-zones/:id
*/
exports.updateZone = async (req, res) => {
  try {
    const zone = await ShippingZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: "منطقة الشحن غير موجودة" });
    }

    const fieldError = validateZoneFields(req.body);
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const {
      name,
      cities,
      price,
      freeShippingThreshold,
      deliveryDurationMin,
      deliveryDurationMax,
      order,
    } = req.body;

    if (cities !== undefined) {
      const normalizedCities = normalizeCities(cities);
      if (normalizedCities.length === 0) {
        return res
          .status(400)
          .json({ message: "لازم تضيف مدينة واحدة على الأقل" });
      }
      const conflictMessage = await validateNoCityConflict(
        normalizedCities,
        zone._id,
      );
      if (conflictMessage) {
        return res.status(409).json({ message: conflictMessage });
      }
      zone.cities = normalizedCities;
    }

    if (name !== undefined) zone.name = name.trim();
    if (price !== undefined) zone.price = Number(price);
    if (freeShippingThreshold !== undefined) {
      zone.freeShippingThreshold =
        freeShippingThreshold === null || freeShippingThreshold === ""
          ? null
          : Number(freeShippingThreshold);
    }
    if (deliveryDurationMin !== undefined)
      zone.deliveryDurationMin = Number(deliveryDurationMin);
    if (deliveryDurationMax !== undefined)
      zone.deliveryDurationMax = Number(deliveryDurationMax);
    if (order !== undefined) zone.order = Number(order);

    if (zone.deliveryDurationMin > zone.deliveryDurationMax) {
      return res.status(400).json({
        message: "الحد الأدنى لمدة التوصيل لازم يكون أقل أو يساوي الحد الأقصى",
      });
    }

    await zone.save();

    return res.status(200).json({
      message: "تم تحديث منطقة الشحن بنجاح",
      zone: serializeZone(zone),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إيقاف / إعادة تفعيل منطقة شحن بسرعة من غير فتح فورم التعديل كامل
  PATCH /api/shipping-zones/:id/status
*/
exports.updateZoneActiveState = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "قيمة الحالة غير صالحة" });
    }

    const zone = await ShippingZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: "منطقة الشحن غير موجودة" });
    }

    zone.isActive = isActive;
    await zone.save();

    return res.status(200).json({
      message: isActive ? "تم تفعيل منطقة الشحن" : "تم إيقاف منطقة الشحن",
      zone: serializeZone(zone),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف منطقة شحن
  DELETE /api/shipping-zones/:id
  ⚠️ ما بيأثرش على الطلبات القديمة اللي استخدمتها أصلاً - بياناتها
  Snapshot ثابت بموديل Order (shippingZoneName/shippingTotal) وبتضل
  تعرض بالضبط شو دفع الزبون وقتها، حتى لو المنطقة نفسها اتحذفت نهائيًا
*/
exports.deleteZone = async (req, res) => {
  try {
    const zone = await ShippingZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: "منطقة الشحن غير موجودة" });
    }
    await zone.deleteOne();
    return res.status(200).json({ message: "تم حذف منطقة الشحن بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

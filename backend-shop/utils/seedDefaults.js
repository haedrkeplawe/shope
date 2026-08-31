const Category = require("../models/category");

/*
  إنشاء فئة "غير مصنف" تلقائيًا لو مش موجودة أصلًا
  - فئة نظامية رئيسية ثابتة، بتستقبل أي منتجات أو فئات فرعية بينقلها الحذف تلقائيًا
  - بتتنفذ مرة واحدة عند تشغيل السيرفر
*/
const seedUncategorizedCategory = async () => {
  try {
    const exists = await Category.findOne({ isSystem: true });
    if (!exists) {
      await Category.create({
        name: "غير مصنف",
        parentId: null,
        order: 999,
        status: "active",
        isSystem: true,
      });
      console.log("✅ تم إنشاء فئة (غير مصنف) الافتراضية");
    }
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء فئة (غير مصنف):", error.message);
  }
};

module.exports = seedUncategorizedCategory;

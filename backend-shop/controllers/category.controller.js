const Category = require("../models/category");
const Product = require("../models/product");

/*
  جلب فئة "غير مصنف" النظامية
*/
const getUncategorized = () => Category.findOne({ isSystem: true });

/*
  جلب كل بيانات صفحة الأقسام والفئات دفعة واحدة
  GET /api/categories/overview
  - بيرجع: الإحصائيات + الأقسام الرئيسية (بعدّاد منتجات تراكمي) + الفئات الفرعية (بعدّاد مباشر)
*/
exports.getOverview = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ order: 1 });

    const productCounts = await Product.aggregate([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    productCounts.forEach((p) => {
      if (p._id) countMap[p._id.toString()] = p.count;
    });

    const mainCategories = categories.filter((c) => !c.parentId);
    const subCategories = categories.filter((c) => c.parentId);

    const mainWithCounts = mainCategories
      .map((main) => {
        const directCount = countMap[main._id.toString()] || 0;
        const childrenIds = subCategories
          .filter((sub) => sub.parentId?.toString() === main._id.toString())
          .map((sub) => sub._id.toString());
        const childrenProductsCount = childrenIds.reduce(
          (sum, cid) => sum + (countMap[cid] || 0),
          0,
        );

        return {
          id: main._id,
          name: main.name,
          image: main.image,
          order: main.order,
          status: main.status,
          isSystem: main.isSystem,
          productsCount: directCount + childrenProductsCount,
        };
      })
      .sort((a, b) => a.order - b.order);

    const subWithCounts = subCategories
      .map((sub) => {
        const parent = mainCategories.find(
          (m) => m._id.toString() === sub.parentId?.toString(),
        );

        return {
          id: sub._id,
          name: sub.name,
          image: sub.image,
          order: sub.order,
          status: sub.status,
          parentId: sub.parentId,
          parentName: parent?.name || "—",
          productsCount: countMap[sub._id.toString()] || 0,
        };
      })
      .sort((a, b) => a.order - b.order);

    const totalProducts = await Product.countDocuments({});
    const activeCategories = categories.filter(
      (c) => c.status === "active",
    ).length;

    return res.status(200).json({
      stats: {
        activeCategories,
        totalProducts,
        subCategoriesCount: subCategories.length,
        mainCategoriesCount: mainCategories.length,
      },
      mainCategories: mainWithCounts,
      subCategories: subWithCounts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب الأقسام الرئيسية فقط (id + name) عشان تتعرض كخيارات في فورم الإضافة/التعديل
  GET /api/categories/main-options
*/
exports.getMainOptions = async (req, res) => {
  try {
    const mainCategories = await Category.find({ parentId: null })
      .select("name")
      .sort({ order: 1 });

    return res.status(200).json({
      mainCategories: mainCategories.map((c) => ({
        id: c._id,
        name: c.name,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  جلب فئة واحدة بالتفصيل (لملء فورم التعديل)
  GET /api/categories/:id
*/
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "الفئة غير موجودة" });
    }
    return res.status(200).json({ category });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  إنشاء فئة جديدة (قسم رئيسي أو فئة فرعية حسب وجود parentId)
  POST /api/categories
*/
exports.createCategory = async (req, res) => {
  try {
    const { name, parentId, order, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: "اسم الفئة مطلوب" });
    }

    let finalParentId = null;

    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res
          .status(400)
          .json({ message: "القسم الرئيسي المحدد غير موجود" });
      }
      if (parent.parentId) {
        return res
          .status(400)
          .json({ message: "لا يمكن إنشاء فئة تحت فئة فرعية أخرى" });
      }
      finalParentId = parent._id;
    }

    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const category = await Category.create({
      name,
      parentId: finalParentId,
      order: order || 1,
      status: status || "active",
      image,
    });

    return res.status(201).json({
      message: "تم إنشاء الفئة بنجاح",
      category,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تعديل فئة موجودة
  PATCH /api/categories/:id
*/
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, order, status } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "الفئة غير موجودة" });
    }

    // لو بيحاول يحوّل قسم رئيسي (له فئات فرعية) لفئة فرعية - ممنوع
    if (parentId && !category.parentId) {
      const hasChildren = await Category.exists({ parentId: category._id });
      if (hasChildren) {
        return res.status(400).json({
          message:
            "لا يمكن تحويل هذا القسم لفئة فرعية لأن له فئات فرعية تابعة له",
        });
      }
    }

    if (parentId) {
      if (parentId === id) {
        return res
          .status(400)
          .json({ message: "لا يمكن أن تكون الفئة أبًا لنفسها" });
      }
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res
          .status(400)
          .json({ message: "القسم الرئيسي المحدد غير موجود" });
      }
      if (parent.parentId) {
        return res
          .status(400)
          .json({ message: "لا يمكن إنشاء فئة تحت فئة فرعية أخرى" });
      }
      category.parentId = parent._id;
    } else {
      category.parentId = null;
    }

    if (name) category.name = name;
    if (order) category.order = order;
    if (status) category.status = status;
    if (req.file) category.image = `/uploads/categories/${req.file.filename}`;

    await category.save();

    return res.status(200).json({ message: "تم تحديث الفئة بنجاح", category });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  تفعيل / إخفاء فئة بسرعة من غير فتح فورم التعديل كامل
  PATCH /api/categories/:id/status
*/
exports.updateCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "hidden"].includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "الفئة غير موجودة" });
    }

    category.status = status;
    await category.save();

    return res
      .status(200)
      .json({ message: "تم تحديث حالة الفئة بنجاح", category });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

/*
  حذف فئة (قسم رئيسي أو فئة فرعية)
  DELETE /api/categories/:id
  - أي محتوى مرتبط بيها (فئات فرعية و/أو منتجات) بينتقل تلقائيًا لفئة "غير مصنف"
  - الفئة النظامية نفسها ("غير مصنف") ميتقدرش تتحذف
*/
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "الفئة غير موجودة" });
    }

    if (category.isSystem) {
      return res
        .status(400)
        .json({ message: "لا يمكن حذف هذه الفئة النظامية" });
    }

    const uncategorized = await getUncategorized();
    if (!uncategorized) {
      return res.status(500).json({
        message: "تعذر إتمام الحذف، فئة (غير مصنف) غير موجودة بقاعدة البيانات",
      });
    }

    if (!category.parentId) {
      // قسم رئيسي: انقل فئاته الفرعية لتصبح تحت "غير مصنف"
      await Category.updateMany(
        { parentId: category._id },
        { parentId: uncategorized._id },
      );
      // انقل المنتجات المرتبطة مباشرة بالقسم نفسه
      await Product.updateMany(
        { categoryId: category._id },
        { categoryId: uncategorized._id },
      );
    } else {
      // فئة فرعية: انقل منتجاتها المباشرة لـ"غير مصنف"
      await Product.updateMany(
        { categoryId: category._id },
        { categoryId: uncategorized._id },
      );
    }

    await category.deleteOne();

    return res.status(200).json({
      message: "تم حذف الفئة ونقل محتواها إلى (غير مصنف)",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
};

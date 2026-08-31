import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiTrash2,
  FiLayers,
  FiGrid,
  FiPackage,
  FiImage,
} from "react-icons/fi";
import { API_URL, ASSET_URL } from "../config/api";
import StatCard from "../components/StatCard";
import CategoryCard from "../components/CategoryCard";
import ActionsDropdown from "../components/ActionsDropdown";

const Categories = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categories/overview`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات الفئات");
        return;
      }

      setData(result);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleToggleStatus = async (category) => {
    const nextStatus = category.status === "active" ? "hidden" : "active";
    try {
      const res = await fetch(`${API_URL}/categories/${category.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة الفئة");
        return;
      }

      toast.success(
        nextStatus === "hidden" ? "تم إخفاء الفئة" : "تم إظهار الفئة",
      );
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${category.name}"؟ سيتم نقل أي محتوى مرتبط بها إلى فئة "غير مصنف".`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/categories/${category.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف الفئة");
        return;
      }

      toast.success(result.message || "تم حذف الفئة");
      fetchOverview();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  if (loading) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  if (!data) {
    return null;
  }

  const { stats, mainCategories, subCategories } = data;

  return (
    <div className="categories-page">
      {/* الهيدر */}
      <div className="categories-header">
        <div>
          <h1 className="categories-title">الأقسام والفئات</h1>
          <p className="categories-subtitle">نظّم وترتيب المنتجات حسب الفئات</p>
        </div>
        <Link to="/categories/new" className="categories-add-btn">
          <FiPlus />
          إضافة فئة جديدة
        </Link>
      </div>

      {/* الإحصائيات */}
      <div className="categories-stats-grid">
        <StatCard
          icon={FiEye}
          iconBg="#dceefc"
          iconColor="#3b82f6"
          value={stats.activeCategories}
          label="الفئات النشطة"
        />
        <StatCard
          icon={FiPackage}
          iconBg="#f3e8ff"
          iconColor="#8b5cf6"
          value={stats.totalProducts}
          label="إجمالي المنتجات"
        />
        <StatCard
          icon={FiLayers}
          iconBg="#e0f7f4"
          iconColor="#14b8a6"
          value={stats.subCategoriesCount}
          label="الفئات الفرعية"
        />
        <StatCard
          icon={FiGrid}
          iconBg="#fce7f3"
          iconColor="#ec4899"
          value={stats.mainCategoriesCount}
          label="الأقسام الرئيسية"
        />
      </div>

      {/* الأقسام الرئيسية */}
      <div className="categories-section">
        <h2 className="categories-section-title">الأقسام الرئيسية</h2>
        <div className="categories-main-grid">
          {mainCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* الفئات الفرعية */}
      <div className="categories-section">
        <h2 className="categories-section-title">الفئات الفرعية</h2>
        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>الفئة</th>
                <th>القسم الرئيسي</th>
                <th>عدد المنتجات</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subCategories.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div className="categories-table-name">
                      <div className="categories-table-name-image">
                        {sub.image ? (
                          <img
                            src={`${ASSET_URL}${sub.image}`}
                            alt={sub.name}
                          />
                        ) : (
                          <FiImage />
                        )}
                      </div>
                      <span>{sub.name}</span>
                    </div>
                  </td>
                  <td>{sub.parentName}</td>
                  <td>{sub.productsCount}</td>
                  <td>
                    <span className="categories-table-order">{sub.order}</span>
                  </td>
                  <td>
                    <span
                      className={`category-status-badge ${
                        sub.status === "active"
                          ? "category-status-badge--active"
                          : "category-status-badge--hidden"
                      }`}
                    >
                      <span className="category-status-dot" />
                      {sub.status === "active" ? "نشط" : "مخفي"}
                    </span>
                  </td>
                  <td>
                    <ActionsDropdown
                      actions={[
                        {
                          label: "تعديل الفئة",
                          icon: <FiEdit2 />,
                          onClick: () => navigate(`/categories/${sub.id}/edit`),
                        },
                        {
                          label: "عرض المنتجات",
                          icon: <FiEye />,
                          onClick: () =>
                            navigate(`/products?category=${sub.id}`),
                        },
                        {
                          label:
                            sub.status === "active"
                              ? "إخفاء الفئة"
                              : "إظهار الفئة",
                          icon: <FiEyeOff />,
                          onClick: () => handleToggleStatus(sub),
                        },
                        {
                          label: "حذف الفئة",
                          icon: <FiTrash2 />,
                          onClick: () => handleDelete(sub),
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}

              {subCategories.length === 0 && (
                <tr>
                  <td colSpan={6} className="categories-table-empty">
                    لا توجد فئات فرعية بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Categories;

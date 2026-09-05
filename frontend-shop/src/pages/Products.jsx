import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiGrid,
  FiList,
  FiFilter,
  FiSearch,
  FiImage,
  FiEdit2,
  FiEye,
  FiTrash2,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import { getProductStatusBadge } from "../utils/productStatus";
import { formatDate } from "../utils/formatDate";
import useFilterValues from "../hooks/useFilterValues";
import ProductCard from "../components/products/ProductCard";
import ProductFilters from "../components/products/ProductFilters";
import ProductQuickView from "../components/products/ProductQuickView";
import ActionsDropdown from "../components/ActionsDropdown";

const defaultFilters = {
  search: "",
  pieceType: "all",
  status: "all",
  gender: "all",
  brand: "all",
  size: "all",
  color: "all",
  condition: "all",
  categoryId: "all",
  priceMin: "",
  priceMax: "",
  hasVideo: false,
  hasDiscount: false,
  freeShipping: false,
  featured: false,
  isNewArrival: false,
  membersOnly: false,
};

/*
  Products
  - صفحة قائمة المنتجات: Grid/List، بحث، فلاتر متقدمة، معاينة سريعة

  ⚠️ خريطة ألوان (colorHexMap) بقت بتتجاب ديناميكيًا من فلتر "color" بدل ما تكون
  ثابتة، وقائمة الماركات بقت من فلتر "brand" (يديره الأدمن) بدل الماركات
  المستخدمة فعليًا بالمنتجات القديمة
*/
const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const { values: colorOptions } = useFilterValues("color");
  const colorHexMap = colorOptions.reduce((acc, c) => {
    acc[c.value] = c.colorHex;
    return acc;
  }, {});

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/categories/overview`, {
          credentials: "include",
        });
        const result = await res.json();
        if (res.ok) {
          setMainCategories(result.mainCategories || []);
          setSubCategories(result.subCategories || []);
        }
      } catch (error) {
        // تجاهل، فلتر الفئات هيفضل مخفي من غير بيانات
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async (activeFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (
          value === "" ||
          value === "all" ||
          value === false ||
          value === undefined
        ) {
          return;
        }
        params.append(key, value);
      });

      const res = await fetch(`${API_URL}/products?${params.toString()}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل المنتجات");
        return;
      }

      setProducts(result.products || []);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(appliedFilters);
  }, [appliedFilters, fetchProducts]);

  // بحث فوري مع تأخير بسيط عشان ما نضربش السيرفر بطلب مع كل حرف
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters((prev) =>
        prev.search === filters.search
          ? prev
          : { ...prev, search: filters.search },
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleEdit = (product) => navigate(`/products/${product._id}/edit`);

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف "${product.name}"؟`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/products/${product._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف المنتج");
        return;
      }

      toast.success(result.message || "تم حذف المنتج");
      fetchProducts(appliedFilters);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  return (
    <div className="products-page">
      {/* الهيدر */}
      <div className="products-header">
        <div>
          <h1 className="products-title">المنتجات</h1>
          <p className="products-subtitle">{products.length} منتج في المتجر</p>
        </div>
        <Link to="/products/new" className="categories-add-btn">
          <FiPlus />
          إضافة منتج جديد
        </Link>
      </div>

      {/* شريط الأدوات */}
      <div className="products-toolbar">
        <div className="products-view-toggle">
          <button
            type="button"
            className={viewMode === "grid" ? "products-view-btn--active" : ""}
            onClick={() => setViewMode("grid")}
          >
            <FiGrid />
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "products-view-btn--active" : ""}
            onClick={() => setViewMode("list")}
          >
            <FiList />
          </button>
        </div>

        <button
          type="button"
          className={`products-filter-toggle ${
            showFilters ? "products-filter-toggle--active" : ""
          }`}
          onClick={() => setShowFilters((s) => !s)}
        >
          <FiFilter />
          الفلاتر المتقدمة
        </button>

        <div className="products-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث بالاسم أو SKU أو اللون أو الماركة أو المقاس..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
      </div>

      {showFilters && (
        <ProductFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          onApply={handleApplyFilters}
          mainCategories={mainCategories}
          subCategories={subCategories}
        />
      )}

      {/* المحتوى */}
      {loading ? (
        <div className="categories-loading">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div className="products-empty">لا توجد منتجات مطابقة</div>
      ) : viewMode === "grid" ? (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              colorHexMap={colorHexMap}
              onQuickView={setQuickViewProduct}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="products-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>صورة</th>
                <th>الاسم</th>
                <th>الماركة</th>
                <th>المقاس</th>
                <th>الألوان</th>
                <th>الحالة</th>
                <th>السعر</th>
                <th>المشاهدات</th>
                <th>تاريخ الإضافة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const badge = getProductStatusBadge(product);
                const primaryImage =
                  product.images?.find((img) => img.isPrimary) ||
                  product.images?.[0];
                return (
                  <tr key={product._id}>
                    <td>
                      <div className="categories-table-name-image">
                        {primaryImage ? (
                          <img
                            src={getImageUrl(primaryImage.url)}
                            alt={product.name}
                          />
                        ) : (
                          <FiImage />
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="products-table-name-link"
                        onClick={() => setQuickViewProduct(product)}
                      >
                        {product.name}
                      </span>
                    </td>
                    <td>{product.brand || "—"}</td>
                    <td>{(product.sizes || []).join("، ") || "—"}</td>
                    <td>
                      {product.colors?.length > 0 ? (
                        <div className="products-table-colors">
                          {product.colors.slice(0, 5).map((color) => (
                            <span
                              key={color}
                              className="product-color-swatch"
                              title={color}
                              style={{
                                backgroundColor: colorHexMap[color] || "#ccc",
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={`category-status-badge category-status-badge--${
                          badge.type === "success" ? "active" : "hidden"
                        }`}
                      >
                        <span className="category-status-dot" />
                        {badge.label}
                      </span>
                    </td>
                    <td>{product.price} ل.س</td>
                    <td>{product.viewsCount || 0}</td>
                    <td>{formatDate(product.createdAt)}</td>
                    <td>
                      <ActionsDropdown
                        actions={[
                          {
                            label: "تعديل المنتج",
                            icon: <FiEdit2 />,
                            onClick: () => handleEdit(product),
                          },
                          {
                            label: "عرض سريع",
                            icon: <FiEye />,
                            onClick: () => setQuickViewProduct(product),
                          },
                          {
                            label: "حذف المنتج",
                            icon: <FiTrash2 />,
                            onClick: () => handleDelete(product),
                            danger: true,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductQuickView
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onEdit={(product) => {
          setQuickViewProduct(null);
          handleEdit(product);
        }}
      />
    </div>
  );
};

export default Products;

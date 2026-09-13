import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiDownload,
  FiSearch,
  FiImage,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiCamera,
  FiSearch as FiInspect,
  FiCheckCircle,
  FiBookmark,
  FiTag,
  FiLayers,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import {
  getProductStatusBadge,
  PIECE_STATUS_OPTIONS,
} from "../utils/productStatus";
import { formatDate } from "../utils/formatDate";
import ActionsDropdown from "../components/ActionsDropdown";

/*
  Inventory
  - صفحة "المخزون وحالة القطع": إدارة سريعة لحالة كل قطعة (متاحة/محجوزة/مباعة...)
    من غير الحاجة لفتح ويزارد التعديل الكامل
  - الفكرة الأساسية: كروت الإحصائيات نفسها بتشتغل كفلتر سريع بالنقر عليها
  - بتستخدم نفس endpoints المنتجات الموجودة أصلاً (GET/PATCH /products)
    + endpoint واحد جديد بس للإحصائيات (GET /products/inventory-overview)
*/

const STAT_CARDS = [
  {
    key: "awaiting_photos",
    label: "قيد التصوير",
    statField: "awaitingPhotos",
    icon: FiCamera,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
  },
  {
    key: "under_review",
    label: "قيد الفحص",
    statField: "underReview",
    icon: FiInspect,
    iconBg: "#fffbeb",
    iconColor: "#d97706",
  },
  {
    key: "sold",
    label: "مباعة",
    statField: "sold",
    icon: FiTag,
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
  },
  {
    key: "reserved",
    label: "محجوزة",
    statField: "reserved",
    icon: FiBookmark,
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
  },
  {
    key: "published",
    label: "متاحة",
    statField: "available",
    icon: FiCheckCircle,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
  },
];

const emptyStats = {
  awaitingPhotos: 0,
  underReview: 0,
  available: 0,
  reserved: 0,
  sold: 0,
  draft: 0,
  hidden: 0,
  total: 0,
};

const sortOptions = [
  { value: "newest", label: "الأحدث إضافة" },
  { value: "oldest", label: "الأقدم إضافة" },
  { value: "price_desc", label: "السعر: الأعلى أولًا" },
  { value: "price_asc", label: "السعر: الأقل أولًا" },
];

const Inventory = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(emptyStats);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [updatingId, setUpdatingId] = useState(null);

  /* ---------- جلب الإحصائيات ---------- */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/products/inventory-overview`, {
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok) setStats(result.stats || emptyStats);
    } catch (error) {
      // تجاهل، هتفضل الكروت بقيمة 0 من غير ما توقف الصفحة
    }
  }, []);

  /* ---------- جلب الفئات (لفلتر بسيط) ---------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/categories/main-options`, {
          credentials: "include",
        });
        const result = await res.json();
        if (res.ok) setCategories(result.mainCategories || []);
      } catch (error) {
        // تجاهل، فلتر الفئة هيفضل مخفي من غير بيانات
      }
    };
    fetchCategories();
  }, []);

  /* ---------- جلب القطع حسب الفلاتر ---------- */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("categoryId", categoryFilter);

      const res = await fetch(`${API_URL}/products?${params.toString()}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل القطع");
        return;
      }
      setProducts(result.products || []);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  /* ---------- ترتيب محلي (من غير طلب سيرفر جديد) ---------- */
  const sortedProducts = useMemo(() => {
    const list = [...products];
    switch (sortBy) {
      case "oldest":
        return list.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
      case "price_desc":
        return list.sort((a, b) => b.price - a.price);
      case "price_asc":
        return list.sort((a, b) => a.price - b.price);
      default:
        return list.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
    }
  }, [products, sortBy]);

  /* ---------- النقر على كارت إحصائية = فلتر سريع (تفعيل/إلغاء) ---------- */
  const handleStatCardClick = (statusKey) => {
    setStatusFilter((prev) => (prev === statusKey ? "all" : statusKey));
  };

  /* ---------- تغيير حالة قطعة من الجدول مباشرة ---------- */
  const handleStatusChange = async (product, newStatus) => {
    if (newStatus === product.publishStatus) return;
    setUpdatingId(product._id);
    try {
      const res = await fetch(`${API_URL}/products/${product._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث حالة القطعة");
        return;
      }

      toast.success("تم تحديث حالة القطعة");
      setProducts((prev) =>
        prev.map((p) =>
          p._id === product._id ? { ...p, publishStatus: newStatus } : p,
        ),
      );
      fetchStats();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUpdatingId(null);
    }
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
        toast.error(result.message || "تعذر حذف القطعة");
        return;
      }

      toast.success(result.message || "تم حذف القطعة");
      fetchProducts();
      fetchStats();
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    }
  };

  /* ---------- تصدير CSV للنتائج المعروضة حاليًا ---------- */
  const handleExport = () => {
    if (sortedProducts.length === 0) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    const headers = [
      "الاسم",
      "SKU",
      "الفئة",
      "المقاس",
      "الحالة",
      "السعر",
      "تاريخ الإضافة",
    ];
    const rows = sortedProducts.map((p) => [
      p.name,
      p.sku || "",
      p.categoryId?.name || "",
      (p.sizes || []).join(" / "),
      getProductStatusBadge(p).label,
      p.price,
      formatDate(p.createdAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `المخزون-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inventory-page">
      {/* الهيدر */}
      <div className="inventory-header">
        <div>
          <h1 className="inventory-title">المخزون وحالة القطع</h1>
          <p className="inventory-subtitle">متابعة حالة جميع القطع في المتجر</p>
        </div>
        <div className="inventory-header-actions">
          <button
            type="button"
            className="inventory-export-btn"
            onClick={handleExport}
          >
            <FiDownload />
            تصدير
          </button>
          <button
            type="button"
            className="inventory-add-btn"
            onClick={() => navigate("/products/new")}
          >
            <FiPlus />
            إضافة قطعة
          </button>
        </div>
      </div>

      {/* كروت الإحصائيات - قابلة للنقر كفلتر سريع */}
      <div className="inventory-stats-grid">
        {STAT_CARDS.map(
          ({ key, label, statField, icon: Icon, iconBg, iconColor }) => (
            <button
              type="button"
              key={key}
              className={`stat-card inventory-stat-card ${
                statusFilter === key ? "inventory-stat-card--active" : ""
              }`}
              onClick={() => handleStatCardClick(key)}
            >
              <div
                className="stat-card-icon"
                style={{ backgroundColor: iconBg, color: iconColor }}
              >
                <Icon />
              </div>
              <span className="stat-card-value">{stats[statField]}</span>
              <span className="stat-card-label">{label}</span>
            </button>
          ),
        )}
        <div className="stat-card inventory-stat-card inventory-stat-card--total">
          <div
            className="stat-card-icon"
            style={{
              backgroundColor: "#fbe9ec",
              color: "var(--primary-color)",
            }}
          >
            <FiLayers />
          </div>
          <span className="stat-card-value">{stats.total}</span>
          <span className="stat-card-label">الكل</span>
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="inventory-toolbar">
        <div className="products-search inventory-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث بالاسم أو SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="inventory-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">كل الفئات</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="inventory-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {statusFilter !== "all" && (
          <button
            type="button"
            className="inventory-clear-filter"
            onClick={() => setStatusFilter("all")}
          >
            إلغاء فلتر الحالة
          </button>
        )}
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="categories-loading">جاري التحميل...</div>
      ) : sortedProducts.length === 0 ? (
        <div className="products-empty">
          <FiPackage size={28} />
          <p>لا توجد قطع مطابقة</p>
        </div>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>SKU</th>
                <th>الفئة</th>
                <th>المقاس</th>
                <th>الحالة</th>
                <th>السعر</th>
                <th>تاريخ الإضافة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => {
                const badge = getProductStatusBadge(product);
                const primaryImage =
                  product.images?.find((img) => img.isPrimary) ||
                  product.images?.[0];
                return (
                  <tr key={product._id}>
                    <td>
                      <div className="categories-table-name">
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
                        {product.name}
                      </div>
                    </td>
                    <td>{product.sku || "—"}</td>
                    <td>{product.categoryId?.name || "غير مصنف"}</td>
                    <td>{(product.sizes || []).join("، ") || "—"}</td>
                    <td>
                      <select
                        className={`inventory-status-select inventory-status-select--${badge.type}`}
                        value={product.publishStatus}
                        disabled={updatingId === product._id}
                        onChange={(e) =>
                          handleStatusChange(product, e.target.value)
                        }
                      >
                        {PIECE_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{product.price} ل.س</td>
                    <td>{formatDate(product.createdAt)}</td>
                    <td>
                      <ActionsDropdown
                        actions={[
                          {
                            label: "تعديل القطعة",
                            icon: <FiEdit2 />,
                            onClick: () => handleEdit(product),
                          },
                          {
                            label: "حذف القطعة",
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
    </div>
  );
};

export default Inventory;

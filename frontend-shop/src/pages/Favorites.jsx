import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiHeart,
  FiUsers,
  FiTrendingUp,
  FiAlertTriangle,
  FiTag,
  FiBell,
  FiImage,
} from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import StatCard from "../components/StatCard";
import ActionsDropdown from "../components/ActionsDropdown";
import Pagination from "../components/Pagination";
import { getProductStatusBadge } from "../utils/productStatus";

/*
  Favorites (صفحة "المفضلة")
  ------------------------------------------------------------------
  مش صفحة إدارة عادية - هدفها الوحيد تحليل سلوك الزبائن: أي المنتجات
  الأكثر حفظًا بمفضلة الزبائن (نية شراء عالية حتى لو ما اشتروا بعد)،
  عشان الأدمن يقدر يستهدفها بعروض/خصومات بذكاء بدل التخمين العشوائي

  إجراءان لكل منتج:
  - "إنشاء عرض": بيودّي لصفحة العروض مع المنتج جاهز مسبقًا (SelectOfferModal
    هناك) - إما إضافته لعرض "منتجات محددة" موجود، أو إنشاء عرض جديد له
  - "إشعار بالخصم": بيبعت إشعار فوري لكل زبون حاطط المنتج بمفضلته - يشتغل
    بس لو في خصم فعلي حاليًا على المنتج (نفس الشرط اللي الباك إند بيتحقق منه)
*/

const sortOptions = [
  { value: "most_saved", label: "الأكثر حفظًا" },
  { value: "conversion", label: "نسبة التحويل" },
  { value: "price", label: "السعر" },
];

const emptyStats = {
  totalFavorites: 0,
  customersWithFavorites: 0,
  avgConversion: 0,
  soldOutFavorited: 0,
};

const Favorites = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(emptyStats);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("most_saved");
  const [page, setPage] = useState(1);
  const [notifyingId, setNotifyingId] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      params.append("sort", sortBy);
      params.append("page", page);
      params.append("limit", 15);

      const res = await fetch(
        `${API_URL}/admin/favorites?${params.toString()}`,
        { credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل بيانات المفضلة");
        return;
      }

      setStats(result.stats || emptyStats);
      setProducts(result.products || []);
      setPagination(result.pagination || { page: 1, totalPages: 0, total: 0 });
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchOverview(), 350);
    return () => clearTimeout(timer);
  }, [fetchOverview]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  const handleCreateOffer = (product) => {
    // بنودّي المنتج جاهز لصفحة العروض - SelectOfferModal هناك بيسمح إما
    // بإضافته لعرض "منتجات محددة" موجود، أو إنشاء عرض جديد له مباشرة
    navigate("/deals", {
      state: {
        addProductToOffer: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          image: product.image,
        },
      },
    });
  };

  const handleNotifyDiscount = async (product) => {
    if (!product.hasDiscount) {
      toast.error("هذا المنتج بدون خصم فعّال حاليًا - أضِفه لعرض أولًا");
      return;
    }

    setNotifyingId(product.id);
    try {
      const res = await fetch(
        `${API_URL}/admin/favorites/${product.id}/notify-discount`,
        { method: "POST", credentials: "include" },
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر إرسال الإشعار");
        return;
      }

      toast.success(result.message);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setNotifyingId(null);
    }
  };

  return (
    <div className="admin-favorites-page">
      <div className="admin-favorites-header">
        <div>
          <h1 className="admin-favorites-title">المفضلة</h1>
          <p className="admin-favorites-subtitle">
            تتبّع المنتجات الأكثر حفظًا وسلوك العملاء
          </p>
        </div>
      </div>

      <div className="admin-favorites-stats-grid">
        <StatCard
          icon={FiHeart}
          iconBg="#fbe9ec"
          iconColor="var(--primary-color)"
          value={stats.totalFavorites}
          label="إجمالي الحفظ"
        />
        <StatCard
          icon={FiUsers}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          value={stats.customersWithFavorites}
          label="عملاء محفظون"
        />
        <StatCard
          icon={FiTrendingUp}
          iconBg="#e0f7f4"
          iconColor="#14b8a6"
          value={`${stats.avgConversion}%`}
          label="متوسط التحويل"
        />
        <StatCard
          icon={FiAlertTriangle}
          iconBg="#fffbeb"
          iconColor="#d97706"
          value={stats.soldOutFavorited}
          label="حفظ منتجات نفدت"
        />
      </div>

      <div className="admin-favorites-toolbar">
        <div className="products-search admin-favorites-search">
          <FiSearch />
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="inventory-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              ترتيب حسب: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="categories-loading">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div className="products-empty">
          <FiHeart size={28} />
          <p>لا توجد منتجات محفوظة بالمفضلة بعد</p>
        </div>
      ) : (
        <>
          <div className="admin-favorites-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>عدد الحفظ</th>
                  <th>نسبة التحويل</th>
                  <th>الحالة</th>
                  <th>السعر</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const badge = getProductStatusBadge(product);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="categories-table-name">
                          <div className="categories-table-name-image">
                            {product.image ? (
                              <img
                                src={getImageUrl(product.image)}
                                alt={product.name}
                              />
                            ) : (
                              <FiImage />
                            )}
                          </div>
                          <div className="admin-favorites-product-info">
                            <span>{product.name}</span>
                            <span className="admin-favorites-product-sku">
                              {product.sku || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-favorites-count">
                          <FiHeart /> {product.favoritesCount}
                        </span>
                      </td>
                      <td>
                        <div className="admin-favorites-conversion">
                          <div className="admin-favorites-conversion-bar">
                            <div
                              className="admin-favorites-conversion-fill"
                              style={{ width: `${product.conversionRate}%` }}
                            />
                          </div>
                          <span>{product.conversionRate}%</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-favorites-status-badge admin-favorites-status-badge--${badge.type}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        <div className="admin-favorites-price">
                          <span>
                            {product.price.toLocaleString("en-US")} ل.س
                          </span>
                          {product.hasDiscount && product.originalPrice && (
                            <span className="admin-favorites-price-original">
                              {product.originalPrice.toLocaleString("en-US")}{" "}
                              ل.س
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <ActionsDropdown
                          actions={[
                            {
                              label: "إنشاء عرض",
                              icon: <FiTag />,
                              onClick: () => handleCreateOffer(product),
                            },
                            {
                              label:
                                notifyingId === product.id
                                  ? "جاري الإرسال..."
                                  : "إشعار بالخصم",
                              icon: <FiBell />,
                              onClick: () => handleNotifyDiscount(product),
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

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default Favorites;

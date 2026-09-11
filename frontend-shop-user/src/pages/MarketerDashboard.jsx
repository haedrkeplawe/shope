// user
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiShare2,
  FiCopy,
  FiCheckCircle,
  FiPercent,
  FiDollarSign,
  FiShoppingBag,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatPrice } from "../utils/formatPrice";
import { getStatusTone } from "../utils/orderStatus";

/*
  MarketerDashboard (لوحة المسوّق)
  ------------------------------------------------------------------
  صفحة خاصة بالزبون المعيَّن كمسوّق بالعمولة من الأدمن فقط (شوف شرح
  موديل Customer الكامل) - عنصر القائمة يلي بيودّي لهون بصفحة "حسابي"
  ما بيظهر أصلاً لزبون عادي، وبنفس الوقت GET /customers/marketer/me
  بالباك إند بيرفض (403) أي حساب مش معلَّم كمسوّق حتى لو حاول يفتح
  الرابط مباشرة - حماية مزدوجة (فرونت + باك إند)

  ⚠️ "إجمالي العمولة" و"إجمالي المبيعات" هون محسوبين فقط من الطلبات
  بحالة "تم التسليم" - نفس القاعدة المستخدمة بالضبط بلوحة الأدمن، عشان
  المسوّق ما يشوف رقم أكبر من المستحق فعليًا قبل ما يتأكد البيع بالكامل
*/
const MarketerDashboard = () => {
  const navigate = useNavigate();
  const [marketer, setMarketer] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/marketer/me`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          // زبون عادي جرّب يفتح الرابط مباشرة - نرجّعه لصفحة حسابي بهدوء
          navigate("/account");
          return;
        }

        setMarketer(data.marketer);
        setMonthlySales(data.monthlySales || []);
        setRecentOrders(data.recentOrders || []);
      } catch (error) {
        toast.error("تعذر تحميل بيانات المسوّق");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(marketer.code);
    toast.success("تم نسخ رمز الإحالة");
  };

  if (loading) return null;
  if (!marketer) return null;

  const maxMonthlyValue = Math.max(1, ...monthlySales.map((m) => m.value));

  return (
    <div className="marketer-dashboard-page">
      <h1 className="marketer-dashboard-title">لوحة المسوّق</h1>

      {/* رمز الإحالة */}
      <div className="marketer-code-card">
        <span className="marketer-code-card-label">
          <FiShare2 /> رمز الإحالة الخاص بك
        </span>
        <div className="marketer-code-box">
          <span dir="ltr">{marketer.code}</span>
          <button type="button" onClick={handleCopyCode}>
            <FiCopy />
          </button>
        </div>
        <p className="marketer-code-hint">
          شارك هذا الرمز مع زبائنك ليدخلوه وقت تأكيد الطلب، وخذ عمولتك تلقائيًا
          من كل عملية بيع
        </p>
      </div>

      {/* الإحصائيات */}
      <div className="marketer-stats-grid">
        <div className="marketer-stat-card">
          <span className="marketer-stat-icon">
            <FiCheckCircle />
          </span>
          <span className="marketer-stat-value">
            {marketer.status === "active" ? "نشط" : "معلَّق"}
          </span>
          <span className="marketer-stat-label">الحالة</span>
        </div>
        <div className="marketer-stat-card">
          <span className="marketer-stat-icon">
            <FiPercent />
          </span>
          <span className="marketer-stat-value">
            {marketer.commissionPercentage}%
          </span>
          <span className="marketer-stat-label">نسبة العمولة</span>
        </div>
        <div className="marketer-stat-card">
          <span className="marketer-stat-icon">
            <FiDollarSign />
          </span>
          <span className="marketer-stat-value">
            {formatPrice(marketer.totalCommission)} ل.س
          </span>
          <span className="marketer-stat-label">إجمالي العمولة</span>
        </div>
        <div className="marketer-stat-card">
          <span className="marketer-stat-icon">
            <FiShoppingBag />
          </span>
          <span className="marketer-stat-value">{marketer.totalSales}</span>
          <span className="marketer-stat-label">إجمالي المبيعات</span>
        </div>
      </div>

      {/* الرسم الشهري */}
      <div className="marketer-section-card">
        <h3 className="marketer-section-title">
          المبيعات الشهرية (آخر 6 شهور)
        </h3>
        <div className="marketer-bar-chart">
          {monthlySales.map((m) => (
            <div className="marketer-bar-col" key={m.label}>
              <span className="marketer-bar-value">
                {m.value > 0 ? m.value : ""}
              </span>
              <div className="marketer-bar-track">
                <div
                  className="marketer-bar-fill"
                  style={{
                    height: `${Math.max(
                      4,
                      (m.value / maxMonthlyValue) * 100,
                    )}%`,
                  }}
                />
              </div>
              <span className="marketer-bar-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* آخر المبيعات */}
      <div className="marketer-section-card">
        <h3 className="marketer-section-title">آخر المبيعات</h3>
        {recentOrders.length === 0 ? (
          <p className="marketer-empty-note">لسه ما في أي طلب استخدم رمزك</p>
        ) : (
          <div className="marketer-sales-list">
            {recentOrders.map((order) => (
              <div className="marketer-sale-row" key={order.id}>
                <div className="marketer-sale-row-top">
                  <span className="marketer-sale-number">
                    #{order.orderNumber}
                  </span>
                  <span
                    className={`order-status order-status--${getStatusTone(
                      order.status,
                    )}`}
                  >
                    {order.statusLabel}
                  </span>
                </div>
                <div className="marketer-sale-row-bottom">
                  <span className="marketer-sale-amount">
                    {formatPrice(order.grandTotal)} ل.س
                  </span>
                  <span
                    className={`marketer-sale-commission${
                      order.status === "delivered"
                        ? ""
                        : " marketer-sale-commission--pending"
                    }`}
                  >
                    +{formatPrice(order.commissionAmount)} ل.س عمولة
                    {order.status !== "delivered" && " (بانتظار التسليم)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketerDashboard;

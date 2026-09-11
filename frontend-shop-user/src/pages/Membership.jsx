// user
import { useEffect, useState } from "react";
import { FiAward, FiCheck, FiPhone } from "react-icons/fi";
import { API_URL } from "../config/api";
import { formatPrice } from "../utils/formatPrice";

/*
  Membership (عضويتي)
  ------------------------------------------------------------------
  صفحة معلوماتية بس - عرض الباقات الثلاث الثابتة (ذهبية/فضية/مجانية)
  مع أسعارها ومزاياها، وتوضيح باقة الزبون الحالية. ⚠️ بلا أي زر
  تفعيل/إلغاء ذاتي - التفعيل كله يدوي بالتواصل مع الإدارة (شوف شرح كامل
  بـ adminMembership.controller.js بلوحة تحكم الأدمن)

  ⚠️ لازم تضاف يدويًا لملف App.js تبع واجهة المتجر (مش موجود ضمن ملفات
  المشروع المرفوعة حاليًا):
  <Route path="/account/membership" element={<Membership />} />
*/
const Membership = () => {
  const [tiers, setTiers] = useState([]);
  const [currentTierKey, setCurrentTierKey] = useState("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const res = await fetch(`${API_URL}/shop/membership-tiers`, {
          credentials: "include",
        });
        const result = await res.json();

        if (res.ok) {
          setTiers(result.tiers);
          setCurrentTierKey(result.currentTierKey);
        }
      } catch (error) {
        // تجاهل - الصفحة بترجع فاضية، الزبون يقدر يعيد المحاولة بإعادة التحميل
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
  }, []);

  if (loading) {
    return <div className="membership-page-loading">جاري التحميل...</div>;
  }

  return (
    <div className="membership-page">
      <h1 className="membership-page-title">عضويتي</h1>
      <p className="membership-page-subtitle">
        باقات عضوية حصرية بمزايا متنوعة - تواصل مع فريق الدعم للترقية
      </p>

      <div className="membership-page-cards">
        {tiers.map((tier) => {
          const isCurrent = tier.tierKey === currentTierKey;
          return (
            <div
              className={`membership-page-card ${
                isCurrent ? "membership-page-card--current" : ""
              }`}
              key={tier.tierKey}
            >
              {isCurrent && (
                <span className="membership-page-current-badge">
                  <FiAward /> باقتك الحالية
                </span>
              )}

              <h3>{tier.displayName}</h3>
              <div className="membership-page-price">
                {tier.price > 0 ? (
                  <>
                    {formatPrice(tier.price)}
                    <span> ل.س / شهري</span>
                  </>
                ) : (
                  <span className="membership-page-free-label">مجانية</span>
                )}
              </div>

              <ul className="membership-page-features">
                {tier.discountPercentage > 0 && (
                  <li>
                    <FiCheck />
                    خصم {tier.discountPercentage}% على الطلبات
                    {tier.minPurchaseForDiscount > 0 &&
                      ` بحد أدنى ${formatPrice(tier.minPurchaseForDiscount)} ل.س`}
                  </li>
                )}
                <li>
                  <FiCheck />
                  توصيل مجاني
                  {tier.freeShippingMinOrder > 0
                    ? ` عند الطلب بـ ${formatPrice(tier.freeShippingMinOrder)} ل.س أو أكثر`
                    : " على كل الطلبات"}
                </li>
                {tier.earlyAccessDelayHours === 0 ? (
                  <li>
                    <FiCheck />
                    وصول فوري للقطع الحصرية فور طرحها
                  </li>
                ) : (
                  tier.tierKey !== "free" && (
                    <li>
                      <FiCheck />
                      وصول مبكر للقطع الحصرية قبل الجميع بـ{" "}
                      {tier.earlyAccessDelayHours} ساعة
                    </li>
                  )
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="membership-page-contact">
        <FiPhone />
        <p>
          للترقية أو الاستفسار عن باقات العضوية، تواصل مع فريق الدعم مباشرة -
          كل عمليات التفعيل تتم يدويًا من إدارة المتجر
        </p>
      </div>
    </div>
  );
};

export default Membership;
// user
import { useEffect, useState } from "react";
import { API_URL } from "../config/api";
import {
  getHomeSectionCache,
  setHomeSectionCache,
} from "../utils/homeSectionCache";

/*
  useHomeSectionData
  ------------------------------------------------------------------
  هوك مشترك بيجيب بيانات قسم عام (بدون فلاتر) من endpoint معيّن مرة وحدة
  وبيخزّنها بكاش homeSectionCache - هو نفس المنطق يلي كان مكرر حرفيًا
  بـ4 كومبوننتات بالرئيسية (NewArrivals، ShopByCategory، ShopByPieceType،
  Testimonials) بعد ما انجمعت الرئيسية بملف واحد

  - endpoint: مسار الـ API بعد API_URL (مثلاً "/shop/categories") - هو نفسه
    مفتاح الكاش (نفس الفلسفة القديمة بالضبط، فمفتاح كل قسم ما تغيّر)
  - field: اسم الحقل يلي بيرجع فيه الـ API القائمة (مثلاً "categories")
  - بيرجّع { items, loading } - items فاضية لو فشل الطلب (القسم بالرئيسية
    ما بيترسم أصلاً لو فاضي - نفس سلوك الكومبوننتات القديمة)

  ⚠️ حماية من الطلب المزدوج: الرئيسية والفوتر بيطلبوا /shop/categories
  بنفس اللحظة (الفوتر بيعرض الأقسام الرئيسية كروابط تحت "تسوّق") - بدون
  inflight كان رح يطلع طلبين متطابقين لأول تحميل بس لأن الكاش لسا فاضي،
  فبنخزّن الـPromise الجاري ونشاركه بين كل المستدعين
*/
const inflight = {};

const loadSection = (endpoint, field) => {
  if (!inflight[endpoint]) {
    inflight[endpoint] = fetch(`${API_URL}${endpoint}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return null;
        const list = data[field] || [];
        setHomeSectionCache(endpoint, { [field]: list });
        return list;
      })
      .catch(() => null)
      .finally(() => {
        delete inflight[endpoint];
      });
  }
  return inflight[endpoint];
};

export const useHomeSectionData = (endpoint, field) => {
  const cached = getHomeSectionCache(endpoint);
  const [items, setItems] = useState(cached?.[field] || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return undefined;

    let active = true;
    loadSection(endpoint, field).then((list) => {
      if (!active) return;
      if (list) setItems(list);
      setLoading(false);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, field]);

  return { items, loading };
};

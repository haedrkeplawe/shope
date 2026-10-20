import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/*
  ScrollManager
  ------------------------------------------------------------------
  المسؤول الوحيد عن موضع السكرول بكل لوحة التحكم لحظة التنقّل بين
  الصفحات - مكوّن بلا واجهة، بينحط مرة وحدة فوق كل المسارات (App.js).
  نسخة مطابقة لنفس المكوّن بموقع الزبون (frontend-shop-user) - أي تعديل
  على المنطق لازم ينعمل بالنسختين

  ليش لازم: اللوحة SPA (BrowserRouter)، فالتنقّل ما بيعيد تحميل الصفحة
  والمتصفح بيترك السكرول مكانه - الصفحة الجديدة كانت تفتح على نفس ارتفاع
  القديمة (أو بآخرها لو كانت أقصر). وزر الرجوع كان يحاول يرجّع المكان
  قبل ما توصل البيانات من السيرفر، فيوقف بمكان غلط

  السلوك حسب نوع التنقّل (useNavigationType):
  - PUSH (ضغط رابط / تغيير فلتر)  → أول الصفحة، أو القسم المحدد لو في #hash
  - POP (رجوع/تقدّم/Refresh)      → نفس المكان المحفوظ لهالخانة بالسجل
  - REPLACE بنفس المسار           → ولا حركة (تحديثات داخلية بالرابط)
  - REPLACE لمسار تاني            → أول الصفحة (تحويلات متل التحويل لصفحة
    الدخول بعد انتهاء الجلسة)

  الحفظ: موضع كل خانة بسجل التصفح (location.key) بـ sessionStorage - بيضل
  بعد Refresh وبينمسح مع إغلاق التبويب. منسجّل الموضع من أحداث scroll نفسها
  (مش لحظة التنقّل) لأنه وقت التنقّل الصفحة الجديدة بتكون انرسمت وممكن
  المتصفح يكون قصّ السكرول أصلاً

  الاسترجاع: لو الصفحة لسا قصيرة (البيانات عم تحمّل) منستنى طولها يكفي
  قبل ما ننزل - بحد أقصى RESTORE_TIMEOUT_MS، وبيتوقف فورًا لو المستخدم لمس
  الشاشة/سكرل بنفسه، عشان ما نسحبه غصب عنه بعد ما بلّش يتصفح
*/

const STORAGE_KEY = "scroll_positions";
const MAX_ENTRIES = 50;
const RESTORE_TIMEOUT_MS = 2500;
const USER_INTERRUPT_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"];

const readPositions = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writePositions = (positions) => {
  try {
    // بنحتفظ بآخر MAX_ENTRIES خانة بس (ترتيب الإدخال = الأقدم أول)
    const keys = Object.keys(positions);
    keys
      .slice(0, Math.max(0, keys.length - MAX_ENTRIES))
      .forEach((key) => delete positions[key]);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (error) {
    // التخزين ممنوع - الاسترجاع بيشتغل بس ضمن نفس الجلسة (من الذاكرة)
  }
};

// "instant" عن قصد - لو أي CSS لاحقًا حط scroll-behavior: smooth، الانتقال
// لصفحة جديدة لازم يكون فوري مش أنيميشن سكرول من تحت لفوق
const scrollToY = (top) =>
  window.scrollTo({ top, left: 0, behavior: "instant" });

const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  const positionsRef = useRef(null);
  if (positionsRef.current === null) positionsRef.current = readPositions();
  const currentKeyRef = useRef(location.key);
  const prevPathnameRef = useRef(null);
  const cancelRestoreRef = useRef(() => {});

  // تعطيل استرجاع المتصفح التلقائي - بيتعارض مع استرجاعنا وبيصير بدري
  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // تسجيل موضع السكرول للخانة الحالية (مرة وحدة لكل frame كحد أقصى)
  useEffect(() => {
    let frame = null;

    const handleScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const key = currentKeyRef.current;
        // مسح وإعادة إدخال عشان الخانة الحالية تصير "الأحدث" بالترتيب
        delete positionsRef.current[key];
        positionsRef.current[key] = window.scrollY;
      });
    };
    const persist = () => writePositions(positionsRef.current);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", persist);
      if (frame !== null) cancelAnimationFrame(frame);
      persist();
    };
  }, []);

  // استرجاع موضع محفوظ - بيستنى لحد ما الصفحة تصير طويلة كفاية
  const restoreTo = (targetY) => {
    if (!targetY || targetY <= 0) {
      scrollToY(0);
      return;
    }

    let frame = null;
    const startedAt = performance.now();

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      USER_INTERRUPT_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, stop),
      );
    };

    const attempt = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll >= targetY) {
        scrollToY(targetY);
        stop();
        return;
      }
      if (performance.now() - startedAt > RESTORE_TIMEOUT_MS) {
        // المحتوى ما وصل لطوله القديم (انحذف منتج مثلاً) - أقرب مكان ممكن
        scrollToY(maxScroll);
        stop();
        return;
      }
      frame = requestAnimationFrame(attempt);
    };

    USER_INTERRUPT_EVENTS.forEach((evt) =>
      window.addEventListener(evt, stop, { passive: true }),
    );
    attempt();
    cancelRestoreRef.current = stop;
  };

  // القسم المحدد بالرابط (#id) - بعد الرسم، ولو مش موجود منطلع لفوق
  const scrollToHash = (hash) => {
    requestAnimationFrame(() => {
      let target = null;
      try {
        target = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch (error) {
        target = null;
      }
      if (target) target.scrollIntoView({ block: "start" });
      else scrollToY(0);
    });
  };

  // useLayoutEffect عشان نحرّك السكرول قبل ما المتصفح يرسم الصفحة الجديدة
  // (بدون وميض للصفحة على الارتفاع القديم قبل ما تطلع لفوق)
  useLayoutEffect(() => {
    cancelRestoreRef.current();
    currentKeyRef.current = location.key;

    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;

    if (navigationType === "POP") {
      const saved = positionsRef.current[location.key];
      if (saved !== undefined) restoreTo(saved);
      else if (location.hash) scrollToHash(location.hash);
      // أول زيارة للصفحة (فتح الموقع من رابط) - المتصفح بيبلّش من فوق أصلاً
      return;
    }

    if (navigationType === "REPLACE" && prevPathname === location.pathname) {
      // نفس الصفحة - منحفظ الموضع الحالي للخانة الجديدة (key تغيّر)
      positionsRef.current[location.key] = window.scrollY;
      return;
    }

    if (location.hash) scrollToHash(location.hash);
    else scrollToY(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // حفظ بالتخزين مع كل تنقّل (رخيص) - احتياط لو pagehide ما انطلق
  useEffect(() => {
    writePositions(positionsRef.current);
  }, [location.key]);

  return null;
};

export default ScrollManager;

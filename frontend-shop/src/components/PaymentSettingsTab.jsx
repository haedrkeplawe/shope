import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUpload, FiTrash2 } from "react-icons/fi";
import { API_URL, getImageUrl } from "../config/api";
import ToggleSwitch from "./ToggleSwitch";

/*
  PaymentSettingsTab
  ------------------------------------------------------------------
  تبويب "الدفع" بصفحة الإعدادات - تفعيل/تعطيل طريقتي الدفع (نقدًا عند
  الاستلام / شام كاش) + رفع/تعديل/حذف صورة QR تبع حساب شام كاش الخاص
  بالمتجر (شوف models/store.js → payments)

  ⚠️ كل تغيير (تفعيل/تعطيل، رفع صورة) بيُحفظ فورًا لحظة الفعل نفسه، بلا
  زر "حفظ" منفصل - نفس فلسفة أي Toggle إعدادات فورية بالنظام. الحماية
  الوحيدة ("لازم طريقة وحدة مفعّلة عالأقل") مطبّقة بالباك إند
  (store.controller.js → updatePaymentSettings) - لو رفض السيرفر التبديل،
  الـ Toggle بيرجع لوضعه القديم تلقائيًا هون مع رسالة خطأ واضحة
*/
const PaymentSettingsTab = () => {
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingQr, setUploadingQr] = useState(false);

  const fetchStoreInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/store`);
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحميل إعدادات الدفع");
        return;
      }

      setPayments(
        result.store.payments || {
          cashEnabled: true,
          shamCashEnabled: false,
          shamCashQrImage: null,
        },
      );
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreInfo();
  }, [fetchStoreInfo]);

  const handleToggle = async (key, checked) => {
    const previous = payments[key];
    setPayments((prev) => ({ ...prev, [key]: checked }));

    try {
      const res = await fetch(`${API_URL}/store/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: checked }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر تحديث الإعدادات");
        setPayments((prev) => ({ ...prev, [key]: previous }));
        return;
      }

      toast.success("تم تحديث إعدادات الدفع");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
      setPayments((prev) => ({ ...prev, [key]: previous }));
    }
  };

  const handleQrChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("qrImage", file);

    setUploadingQr(true);
    try {
      const res = await fetch(`${API_URL}/store/payments/qr`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر رفع الصورة");
        return;
      }

      toast.success("تم تحديث صورة QR بنجاح");
      setPayments(result.store.payments);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRemoveQr = async () => {
    if (!window.confirm("متأكد إنك بدك تحذف صورة QR الحالية؟")) return;

    setUploadingQr(true);
    try {
      const res = await fetch(`${API_URL}/store/payments/qr`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "تعذر حذف الصورة");
        return;
      }

      toast.success("تم حذف الصورة");
      setPayments(result.store.payments);
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setUploadingQr(false);
    }
  };

  if (loading || !payments) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  return (
    <div className="settings-payment-tab">
      <label className="advanced-filter-modal-toggle-row settings-payment-toggle-row">
        <div>
          <span>الدفع عند الاستلام</span>
          <p>الزبون بيدفع نقدًا لمندوب التوصيل وقت استلام طلبه</p>
        </div>
        <ToggleSwitch
          checked={payments.cashEnabled}
          onChange={(checked) => handleToggle("cashEnabled", checked)}
        />
      </label>

      <label className="advanced-filter-modal-toggle-row settings-payment-toggle-row">
        <div>
          <span>الدفع عبر شام كاش</span>
          <p>
            الزبون بيحوّل المبلغ عبر تطبيق شام كاش ويرفع صورة الإيصال، وأنت
            بتأكد الدفع يدويًا من صفحة تفاصيل الطلب
          </p>
        </div>
        <ToggleSwitch
          checked={payments.shamCashEnabled}
          onChange={(checked) => handleToggle("shamCashEnabled", checked)}
        />
      </label>

      {payments.shamCashEnabled && (
        <div className="settings-payment-qr-section">
          <h3 className="settings-payment-qr-title">صورة QR تبع شام كاش</h3>
          <p className="order-form-hint">
            هاي الصورة رح تظهر للزبون وقت ما يختار الدفع عبر شام كاش بصفحة إتمام
            الطلب
          </p>

          <label className="category-image-upload settings-payment-qr-upload">
            {payments.shamCashQrImage ? (
              <>
                <img
                  src={getImageUrl(payments.shamCashQrImage)}
                  alt="QR شام كاش"
                />
                <div className="category-image-upload-overlay">
                  <FiUpload />
                  تغيير الصورة
                </div>
              </>
            ) : (
              <div className="category-image-upload-empty">
                <FiUpload />
                <span>اضغط لرفع صورة QR</span>
                <span className="category-image-upload-hint">
                  PNG, JPG — بحد أقصى 2MB
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleQrChange}
              hidden
              disabled={uploadingQr}
            />
          </label>

          {payments.shamCashQrImage && (
            <button
              type="button"
              className="staff-cancel-btn settings-payment-qr-remove"
              onClick={handleRemoveQr}
              disabled={uploadingQr}
            >
              <FiTrash2 /> حذف الصورة
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentSettingsTab;

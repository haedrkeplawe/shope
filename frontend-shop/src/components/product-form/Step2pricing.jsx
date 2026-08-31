import React from "react";
import { FiDollarSign, FiPercent } from "react-icons/fi";
import ToggleSwitch from "../ToggleSwitch";

/*
  Step2Pricing
  - الأسعار والتكلفة: سعر البيع (مطلوب)، سعر الشراء، السعر الأصلي، سعر الشحن
  - إعدادات العرض والخصم: 4 مفاتيح تبديل + نسبة الخصم وتاريخ انتهائه
    (نسبة الخصم وتاريخه بيتعطلوا لو الخصم مش مفعّل)
*/
const Step2Pricing = ({ formData, updateField }) => {
  return (
    <div className="product-form-cards">
      {/* الأسعار والتكلفة */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiDollarSign />
          الأسعار والتكلفة
        </h3>

        <div className="product-form-two-cols">
          <div className="product-form-group">
            <label>سعر البيع *</label>
            <div className="product-price-input">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={formData.price}
                onChange={(e) => updateField("price", e.target.value)}
              />
              <span className="product-price-currency">ل.س</span>
            </div>
          </div>

          <div className="product-form-group">
            <label>سعر الشراء (التكلفة)</label>
            <div className="product-price-input">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={formData.costPrice}
                onChange={(e) => updateField("costPrice", e.target.value)}
              />
              <span className="product-price-currency">ل.س</span>
            </div>
          </div>
        </div>

        <div className="product-form-two-cols">
          <div className="product-form-group">
            <label>السعر الأصلي (قبل التخفيض)</label>
            <div className="product-price-input">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={formData.originalPrice}
                onChange={(e) => updateField("originalPrice", e.target.value)}
              />
              <span className="product-price-currency">ل.س</span>
            </div>
          </div>

          <div className="product-form-group">
            <label>سعر الشحن</label>
            <div className="product-price-input">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={formData.shippingPrice}
                onChange={(e) => updateField("shippingPrice", e.target.value)}
              />
              <span className="product-price-currency">ل.س</span>
            </div>
          </div>
        </div>
      </div>

      {/* إعدادات العرض والخصم */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiPercent />
          إعدادات العرض والخصم
        </h3>

        <div className="product-toggle-row">
          <span className="product-toggle-label">تفعيل خصم على هذا المنتج</span>
          <ToggleSwitch
            checked={formData.discountEnabled}
            onChange={(val) => updateField("discountEnabled", val)}
          />
        </div>

        <div className="product-toggle-row">
          <span className="product-toggle-label">شحن مجاني لهذا المنتج</span>
          <ToggleSwitch
            checked={formData.freeShipping}
            onChange={(val) => updateField("freeShipping", val)}
          />
        </div>

        <div className="product-toggle-row">
          <span className="product-toggle-label">منتج مميز (يظهر أولًا)</span>
          <ToggleSwitch
            checked={formData.featured}
            onChange={(val) => updateField("featured", val)}
          />
        </div>

        <div className="product-toggle-row">
          <span className="product-toggle-label">منتج جديد (شارة New)</span>
          <ToggleSwitch
            checked={formData.isNew}
            onChange={(val) => updateField("isNew", val)}
          />
        </div>

        <div className="product-form-two-cols product-discount-fields">
          <div className="product-form-group">
            <label>نسبة الخصم (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={formData.discountPercent}
              onChange={(e) => updateField("discountPercent", e.target.value)}
              disabled={!formData.discountEnabled}
            />
          </div>

          <div className="product-form-group">
            <label>تاريخ انتهاء الخصم</label>
            <input
              type="date"
              value={formData.discountEndDate}
              onChange={(e) => updateField("discountEndDate", e.target.value)}
              disabled={!formData.discountEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2Pricing;

import React, { useState } from "react";
import { FiFileText, FiSearch, FiX, FiSend } from "react-icons/fi";
import { PUBLISH_STATUS_OPTIONS } from "../../constants/Productoptions";

/*
  Step7SeoPublish
  - الوصف والمحتوى: وصف مختصر (بحد أقصى 160 حرف)، تفصيلي، ليه القطعة مميزة
  - SEO: عنوان الصفحة (60 حرف)، الميتا (160 حرف)، وسوم بحث (Tags قابلة للإضافة)
  - حالة النشر: 5 خيارات، القيمة دي هي اللي بتتبعت مع باقي المنتج عند "نشر المنتج"
*/
const Step7SeoPublish = ({ formData, updateField }) => {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (!formData.searchTags.includes(value)) {
      updateField("searchTags", [...formData.searchTags, value]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag) => {
    updateField(
      "searchTags",
      formData.searchTags.filter((t) => t !== tag),
    );
  };

  return (
    <div className="product-form-cards">
      {/* الوصف والمحتوى */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiFileText />
          الوصف والمحتوى
        </h3>

        <div className="product-form-group">
          <label>وصف مختصر *</label>
          <textarea
            rows={2}
            maxLength={160}
            placeholder="وصف قصير يظهر في صفحات الفئات والبحث (حتى 160 حرفًا)"
            value={formData.shortDescription}
            onChange={(e) => updateField("shortDescription", e.target.value)}
          />
          <span className="product-char-counter">
            {formData.shortDescription.length} / 160 حرف
          </span>
        </div>

        <div className="product-form-group">
          <label>وصف تفصيلي</label>
          <textarea
            rows={5}
            placeholder="اكتب وصفًا تفصيليًا يشمل: مواد القطعة، مناسبة الاستخدام، كيفية التنسيق، تاريخ القطعة إن وُجد..."
            value={formData.detailedDescription}
            onChange={(e) => updateField("detailedDescription", e.target.value)}
          />
        </div>

        <div className="product-form-group">
          <label>لماذا هذه القطعة مميزة؟</label>
          <textarea
            rows={3}
            placeholder="ما الذي يجعل هذه القطعة استثنائية؟ قصتها، ندرتها، جودتها..."
            value={formData.whySpecial}
            onChange={(e) => updateField("whySpecial", e.target.value)}
          />
        </div>
      </div>

      {/* تهيئة محركات البحث */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiSearch />
          تهيئة محركات البحث (SEO)
        </h3>

        <div className="product-form-group">
          <label>عنوان الصفحة (SEO Title)</label>
          <input
            type="text"
            maxLength={60}
            placeholder="مثال: بلايزر كلاسيكي بيج - ماركة Zara مقاس M"
            value={formData.seoTitle}
            onChange={(e) => updateField("seoTitle", e.target.value)}
          />
          <span className="product-char-counter">
            {formData.seoTitle.length} / 60 حرف
          </span>
        </div>

        <div className="product-form-group">
          <label>وصف الصفحة (Meta Description)</label>
          <textarea
            rows={2}
            maxLength={160}
            placeholder="وصف موجز لمحركات البحث (يظهر في نتائج Google)"
            value={formData.seoDescription}
            onChange={(e) => updateField("seoDescription", e.target.value)}
          />
          <span className="product-char-counter">
            {formData.seoDescription.length} / 160 حرف
          </span>
        </div>

        <div className="product-form-group">
          <label>وسوم البحث (Tags)</label>
          <div className="product-tags-input-row">
            <input
              type="text"
              placeholder="بلايزر، نسائي، كلاسيكي، مقاس..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
            />
          </div>
          {formData.searchTags.length > 0 && (
            <div className="product-tags-chips">
              {formData.searchTags.map((tag) => (
                <span className="product-tag-chip" key={tag}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <FiX />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="product-form-hint">افصل بين الوسوم بفاصلة أو Enter</p>
        </div>
      </div>

      {/* حالة النشر */}
      <div className="product-form-card">
        <h3 className="product-form-card-title">
          <FiSend />
          حالة النشر
        </h3>

        <div className="product-publish-options">
          {PUBLISH_STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`product-publish-option ${
                formData.publishStatus === option.value
                  ? "product-publish-option--active"
                  : ""
              }`}
              onClick={() => updateField("publishStatus", option.value)}
            >
              <span className="product-publish-option-title">
                {option.label}
              </span>
              <span className="product-publish-option-desc">{option.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step7SeoPublish;

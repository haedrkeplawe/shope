import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiLayers, FiUpload, FiEye, FiEyeOff, FiImage } from "react-icons/fi";
import { API_URL, ASSET_URL } from "../config/api";

/*
  CategoryForm
  - فورم واحد مشترك لإضافة فئة جديدة وتعديل فئة موجودة
  - لو parentId فاضي => قسم رئيسي، لو فيها قيمة => فئة فرعية تابعة للقسم المختار
*/
const CategoryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(""); // "" يعني "قسم رئيسي"
  const [order, setOrder] = useState(1);
  const [status, setStatus] = useState("active");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [mainOptions, setMainOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // جلب قائمة الأقسام الرئيسية لعرضها كخيارات
  useEffect(() => {
    const fetchMainOptions = async () => {
      try {
        const res = await fetch(`${API_URL}/categories/main-options`, {
          credentials: "include",
        });
        const result = await res.json();
        if (res.ok) {
          setMainOptions(result.mainCategories || []);
        }
      } catch (error) {
        // تجاهل، هيفضل خيار "قسم رئيسي" متاح على أي حال
      }
    };
    fetchMainOptions();
  }, []);

  // لو تعديل، هات بيانات الفئة الحالية
  useEffect(() => {
    if (!isEdit) return;

    const fetchCategory = async () => {
      try {
        const res = await fetch(`${API_URL}/categories/${id}`, {
          credentials: "include",
        });
        const result = await res.json();

        if (!res.ok) {
          toast.error(result.message || "تعذر تحميل بيانات الفئة");
          navigate("/categories");
          return;
        }

        const category = result.category;
        setName(category.name);
        setParentId(category.parentId || "");
        setOrder(category.order || 1);
        setStatus(category.status || "active");
        if (category.image) {
          setImagePreview(`${ASSET_URL}${category.image}`);
        }
      } catch (error) {
        toast.error("تعذر الاتصال بالسيرفر");
      } finally {
        setFetching(false);
      }
    };

    fetchCategory();
  }, [id, isEdit, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("اسم الفئة مطلوب");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("parentId", parentId);
    formData.append("order", order);
    formData.append("status", status);
    if (imageFile) formData.append("image", imageFile);

    setLoading(true);
    try {
      const url = isEdit
        ? `${API_URL}/categories/${id}`
        : `${API_URL}/categories`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "حدث خطأ أثناء الحفظ");
        return;
      }

      toast.success(result.message || "تم الحفظ بنجاح");
      navigate("/categories");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  const selectedParentName = parentId
    ? mainOptions.find((m) => m.id === parentId)?.name || "فئة فرعية"
    : "قسم رئيسي";

  return (
    <div className="category-form-page">
      <div className="category-form-header">
        <h1 className="category-form-title">
          {isEdit ? `تعديل: ${name}` : "إضافة فئة جديدة"}
        </h1>
        <p className="category-form-subtitle">
          {isEdit
            ? "تعديل بيانات الفئة وإعداداتها"
            : "إنشاء قسم أو فئة جديدة في المتجر"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="category-form-grid">
        {/* العمود الجانبي */}
        <div className="category-form-side">
          <div className="category-form-card">
            <h3 className="category-form-card-title">حالة الظهور</h3>
            <div className="category-visibility-options">
              <button
                type="button"
                className={`category-visibility-option ${
                  status === "active"
                    ? "category-visibility-option--active"
                    : ""
                }`}
                onClick={() => setStatus("active")}
              >
                <FiEye />
                <span className="category-visibility-option-text">
                  <span className="category-visibility-option-title">
                    نشط ومرئي
                  </span>
                  <span className="category-visibility-option-desc">
                    تظهر للزوار في المتجر
                  </span>
                </span>
              </button>

              <button
                type="button"
                className={`category-visibility-option ${
                  status === "hidden"
                    ? "category-visibility-option--hidden-selected"
                    : ""
                }`}
                onClick={() => setStatus("hidden")}
              >
                <FiEyeOff />
                <span className="category-visibility-option-text">
                  <span className="category-visibility-option-title">مخفي</span>
                  <span className="category-visibility-option-desc">
                    لا تظهر للزوار
                  </span>
                </span>
              </button>
            </div>
          </div>

          {isEdit && (
            <div className="category-form-card">
              <h3 className="category-form-card-title">معاينة</h3>
              <div className="category-preview-card">
                <div className="category-preview-image">
                  {imagePreview ? (
                    <img src={imagePreview} alt={name} />
                  ) : (
                    <FiImage />
                  )}
                </div>
                <div className="category-preview-info">
                  <span className="category-preview-name">{name || "—"}</span>
                  <span className="category-preview-parent">
                    {selectedParentName}
                  </span>
                  <span
                    className={`category-status-badge ${
                      status === "active"
                        ? "category-status-badge--active"
                        : "category-status-badge--hidden"
                    }`}
                  >
                    <span className="category-status-dot" />
                    {status === "active" ? "نشط" : "مخفي"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="category-form-submit"
            disabled={loading}
          >
            {loading
              ? "جاري الحفظ..."
              : isEdit
              ? "حفظ التعديلات"
              : "إضافة الفئة"}
          </button>
          <button
            type="button"
            className="category-form-cancel"
            onClick={() => navigate("/categories")}
          >
            إلغاء
          </button>
        </div>

        {/* العمود الرئيسي */}
        <div className="category-form-main">
          <div className="category-form-card">
            <h3 className="category-form-card-title">
              <FiLayers />
              المعلومات الأساسية
            </h3>

            <div className="category-form-group">
              <label>اسم الفئة *</label>
              <input
                type="text"
                placeholder="مثال: فساتين، أحذية رجالية..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="category-form-group">
              <label>القسم الرئيسي</label>
              <p className="category-form-hint">
                اتركها كـ"قسم رئيسي" لإنشاء قسم جديد، أو اختر قسمًا لإنشاء فئة
                فرعية تابعة له
              </p>
              <div className="category-parent-options">
                <button
                  type="button"
                  className={`category-parent-option ${
                    parentId === "" ? "category-parent-option--active" : ""
                  }`}
                  onClick={() => setParentId("")}
                >
                  <FiLayers />
                  قسم رئيسي
                </button>
                {mainOptions
                  .filter((main) => main.id !== id)
                  .map((main) => (
                    <button
                      key={main.id}
                      type="button"
                      className={`category-parent-option ${
                        parentId === main.id
                          ? "category-parent-option--active"
                          : ""
                      }`}
                      onClick={() => setParentId(main.id)}
                    >
                      {main.name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="category-form-group">
              <label>ترتيب الظهور</label>
              <input
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="category-order-input"
              />
            </div>
          </div>

          <div className="category-form-card">
            <h3 className="category-form-card-title">
              <FiImage />
              صورة الفئة
            </h3>
            <label className="category-image-upload">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="معاينة" />
                  <div className="category-image-upload-overlay">
                    <FiUpload />
                    تغيير الصورة
                  </div>
                </>
              ) : (
                <div className="category-image-upload-empty">
                  <FiUpload />
                  <span>اضغط لرفع صورة</span>
                  <span className="category-image-upload-hint">
                    PNG, JPG — بحد أقصى 2MB
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;

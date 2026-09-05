import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiTag,
  FiDollarSign,
  FiImage,
  FiEdit3,
  FiScissors,
  FiClipboard,
  FiFileText,
  FiCheck,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
import { API_URL } from "../config/api";
import { DEFAULT_INSPECTION_ITEMS } from "../constants/Productoptions";
import Step1BasicInfo from "../components/product-form/Step1basicinfo";
import Step2Pricing from "../components/product-form/Step2pricing";
import Step3Media from "../components/product-form/Step3media";
import Step4Measurements from "../components/product-form/Step4measurements";
import Step5Fabric from "../components/product-form/Step5fabric";
import Step6Inspection from "../components/product-form/Step6inspection";
import Step7SeoPublish from "../components/product-form/Step7seopublish";

/*
  ProductForm
  - ويزارد موحّد لإضافة/تعديل منتج، بيحتفظ بكل بيانات الخطوات السبعة في state واحد
  - كل خطوة مكوّن منفصل، بياخد formData + updateField ويعدّل عليهم مباشرة

  ⚠️ تحديث الفلاتر المتقدمة:
  - اتشال حقل "seasonSuitability" (اندمج مع "season" بالخطوة الأولى)
  - اتضاف حقل "membersOnly" (مرتبط بفلتر "للأعضاء فقط" النظامي)
*/

const STEPS = [
  { key: "basic", label: "المعلومات الأساسية", icon: FiTag },
  { key: "pricing", label: "السعر والعروض", icon: FiDollarSign },
  { key: "media", label: "الصور والفيديو", icon: FiImage },
  { key: "measurements", label: "المقاسات", icon: FiEdit3 },
  { key: "fabric", label: "القماش والعناية", icon: FiScissors },
  { key: "inspection", label: "تقرير الفحص", icon: FiClipboard },
  { key: "seo", label: "الوصف وال SEO", icon: FiFileText },
];

const STEP_COMPONENTS = [
  Step1BasicInfo,
  Step2Pricing,
  Step3Media,
  Step4Measurements,
  Step5Fabric,
  Step6Inspection,
  Step7SeoPublish,
];

const initialFormData = {
  // الخطوة 1
  name: "",
  categoryId: "",
  pieceType: "",
  gender: "unisex",
  brand: "",
  season: "",
  colors: [],
  sizes: [],
  condition: "",
  sku: "",
  quantity: 1,

  // الخطوة 2
  price: "",
  costPrice: "",
  originalPrice: "",
  shippingPrice: "",
  discountEnabled: false,
  freeShipping: false,
  featured: false,
  isNewArrival: false,
  membersOnly: false,
  discountPercent: "",
  discountEndDate: "",

  // الخطوة 3
  images: [],
  videoUrl: "",
  videoFile: null,

  // الخطوة 4
  qualityRating: "",
  measurements: {
    chestWidth: "",
    shoulderWidth: "",
    totalLength: "",
    sleeveLength: "",
    waist: "",
    hip: "",
  },
  buyerNote: "",

  // الخطوة 5
  mainFabric: "",
  fabricDensity: "",
  fabricElasticity: "",
  fabricComposition: [],
  careInstructions: [],

  // الخطوة 6
  inspectionReport: DEFAULT_INSPECTION_ITEMS,

  // الخطوة 7
  shortDescription: "",
  detailedDescription: "",
  whySpecial: "",
  seoTitle: "",
  seoDescription: "",
  searchTags: [],
  publishStatus: "draft",
};

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // جلب بيانات المنتج الحالية في وضع التعديل
  useEffect(() => {
    if (!isEdit) return;

    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/products/${id}`, {
          credentials: "include",
        });
        const result = await res.json();

        if (!res.ok) {
          toast.error(result.message || "تعذر تحميل بيانات المنتج");
          navigate("/products");
          return;
        }

        const p = result.product;
        setFormData({
          ...initialFormData,
          name: p.name || "",
          categoryId: p.categoryId?._id || p.categoryId || "",
          pieceType: p.pieceType || "",
          gender: p.gender || "unisex",
          brand: p.brand || "",
          season: p.season || "",
          colors: p.colors || [],
          sizes: p.sizes || [],
          condition: p.condition || "",
          sku: p.sku || "",
          quantity: p.quantity ?? 1,

          price: p.price ?? "",
          costPrice: p.costPrice ?? "",
          originalPrice: p.originalPrice ?? "",
          shippingPrice: p.shippingPrice ?? "",
          discountEnabled: p.discountEnabled || false,
          freeShipping: p.freeShipping || false,
          featured: p.featured || false,
          isNewArrival: p.isNewArrival || false,
          membersOnly: p.membersOnly || false,
          discountPercent: p.discountPercent ?? "",
          discountEndDate: p.discountEndDate
            ? String(p.discountEndDate).split("T")[0]
            : "",

          images: (p.images || []).map((img) => ({ ...img, existing: true })),
          videoUrl: p.videoUrl || "",
          videoFile: p.videoFile || null,

          qualityRating: p.qualityRating || "",
          measurements: {
            ...initialFormData.measurements,
            ...(p.measurements || {}),
          },
          buyerNote: p.buyerNote || "",

          mainFabric: p.mainFabric || "",
          fabricDensity: p.fabricDensity || "",
          fabricElasticity: p.fabricElasticity || "",
          fabricComposition: p.fabricComposition || [],
          careInstructions: p.careInstructions || [],

          inspectionReport:
            p.inspectionReport && p.inspectionReport.length > 0
              ? p.inspectionReport
              : DEFAULT_INSPECTION_ITEMS,

          shortDescription: p.shortDescription || "",
          detailedDescription: p.detailedDescription || "",
          whySpecial: p.whySpecial || "",
          seoTitle: p.seoTitle || "",
          seoDescription: p.seoDescription || "",
          searchTags: p.searchTags || [],
          publishStatus: p.publishStatus || "draft",
        });
      } catch (error) {
        toast.error("تعذر الاتصال بالسيرفر");
      } finally {
        setFetching(false);
      }
    };

    fetchProduct();
  }, [id, isEdit, navigate]);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  /*
    بناء FormData للإرسال:
    - الحقول البسيطة كنص عادي
    - الحقول المركّبة (ألوان، مقاسات، قياسات، تركيب قماش...) كـ JSON string
    - الصور: القديمة (وضع التعديل) في existingImages، والجديدة كملفات + imageMeta
  */
  const buildFormData = () => {
    const fd = new FormData();

    const scalarFields = [
      "name",
      "categoryId",
      "pieceType",
      "gender",
      "brand",
      "season",
      "condition",
      "sku",
      "quantity",
      "price",
      "costPrice",
      "originalPrice",
      "shippingPrice",
      "discountPercent",
      "discountEndDate",
      "videoUrl",
      "qualityRating",
      "buyerNote",
      "mainFabric",
      "fabricDensity",
      "fabricElasticity",
      "shortDescription",
      "detailedDescription",
      "whySpecial",
      "seoTitle",
      "seoDescription",
      "publishStatus",
    ];
    scalarFields.forEach((field) => {
      const value = formData[field];
      fd.append(field, value === null || value === undefined ? "" : value);
    });

    const boolFields = [
      "discountEnabled",
      "freeShipping",
      "featured",
      "isNewArrival",
      "membersOnly",
    ];
    boolFields.forEach((field) => fd.append(field, String(formData[field])));

    const jsonFields = [
      "colors",
      "sizes",
      "measurements",
      "fabricComposition",
      "careInstructions",
      "inspectionReport",
      "searchTags",
    ];
    jsonFields.forEach((field) =>
      fd.append(field, JSON.stringify(formData[field])),
    );

    const existingImages = formData.images.filter((img) => img.existing);
    const newImages = formData.images.filter(
      (img) => !img.existing && img.file,
    );

    if (isEdit) {
      fd.append(
        "existingImages",
        JSON.stringify(
          existingImages.map(({ url, tags, isPrimary }) => ({
            url,
            tags,
            isPrimary,
          })),
        ),
      );
      fd.append(
        "newImageMeta",
        JSON.stringify(
          newImages.map(({ tags, isPrimary }) => ({ tags, isPrimary })),
        ),
      );
    } else {
      fd.append(
        "imageMeta",
        JSON.stringify(
          newImages.map(({ tags, isPrimary }) => ({ tags, isPrimary })),
        ),
      );
    }
    newImages.forEach((img) => fd.append("images", img.file));

    if (formData.videoFile instanceof File) {
      fd.append("video", formData.videoFile);
    }

    return fd;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("اسم المنتج مطلوب");
      setCurrentStep(0);
      return;
    }
    if (!formData.price) {
      toast.error("سعر البيع مطلوب");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      const fd = buildFormData();
      const url = isEdit ? `${API_URL}/products/${id}` : `${API_URL}/products`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: fd,
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "حدث خطأ أثناء الحفظ");
        return;
      }

      toast.success(result.message || "تم حفظ المنتج بنجاح");
      navigate("/products");
    } catch (error) {
      toast.error("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="categories-loading">جاري التحميل...</div>;
  }

  const StepComponent = STEP_COMPONENTS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="product-form-page">
      <div className="product-form-header">
        <h1 className="product-form-title">
          {isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}
        </h1>
        <p className="product-form-subtitle">
          الخطوة {currentStep + 1} من {STEPS.length} ·{" "}
          {STEPS[currentStep].label}
        </p>
      </div>

      {/* الـ Stepper */}
      <div className="product-stepper">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <button
              type="button"
              key={step.key}
              className={`product-stepper-item ${
                isActive ? "product-stepper-item--active" : ""
              } ${isDone ? "product-stepper-item--done" : ""}`}
              onClick={() => setCurrentStep(index)}
            >
              <span className="product-stepper-icon">
                {isDone ? <FiCheck /> : <Icon />}
              </span>
              <span className="product-stepper-label">{step.label}</span>
            </button>
          );
        })}
        <div className="product-stepper-track">
          <div
            className="product-stepper-track-fill"
            style={{
              width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* محتوى الخطوة الحالية */}
      <StepComponent
        formData={formData}
        updateField={updateField}
        setFormData={setFormData}
        isEdit={isEdit}
        productId={id}
      />

      {/* أزرار التنقل */}
      <div className="product-form-nav">
        <button
          type="button"
          className="product-form-nav-btn product-form-nav-btn--prev"
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          <FiChevronRight />
          السابق
        </button>

        {isLastStep ? (
          <button
            type="button"
            className="product-form-nav-btn product-form-nav-btn--submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            <FiCheck />
            {loading ? "جاري النشر..." : "نشر المنتج"}
          </button>
        ) : (
          <button
            type="button"
            className="product-form-nav-btn product-form-nav-btn--next"
            onClick={goNext}
          >
            التالي
            <FiChevronLeft />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductForm;

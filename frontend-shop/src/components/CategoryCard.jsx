import React from "react";
import { Link } from "react-router-dom";
import { FiEdit2, FiImage } from "react-icons/fi";
import { ASSET_URL } from "../config/api";

/*
  CategoryCard
  - كارت القسم الرئيسي (زي أحذية / رجالي / نسائي...)
  - يعرض بس زر "تعديل"، مفيش إخفاء/حذف هنا حسب التصميم
*/
const CategoryCard = ({ category }) => {
  const { id, name, image, productsCount, status } = category;

  return (
    <div className="category-card">
      <div className="category-card-image">
        {image ? <img src={`${ASSET_URL}${image}`} alt={name} /> : <FiImage />}
      </div>

      <div className="category-card-body">
        <div className="category-card-info">
          <h3 className="category-card-name">{name}</h3>
          <p className="category-card-count">{productsCount} منتج</p>
        </div>

        <div className="category-card-footer">
          <Link to={`/categories/${id}/edit`} className="category-card-edit">
            <FiEdit2 />
            تعديل
          </Link>
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
  );
};

export default CategoryCard;

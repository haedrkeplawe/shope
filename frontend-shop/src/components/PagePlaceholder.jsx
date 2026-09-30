/*
  PagePlaceholder
  - صفحة فارغة مؤقتة، بنستخدمها لكل عناصر القائمة الجانبية لحد ما نصمم محتوى كل صفحة لاحقًا
*/
const PagePlaceholder = ({ title }) => {
  return (
    <div className="page-placeholder">
      <h1 className="page-placeholder-title">{title}</h1>
      <p className="page-placeholder-text">هذه الصفحة قيد الإنشاء حاليًا</p>
    </div>
  );
};

export default PagePlaceholder;

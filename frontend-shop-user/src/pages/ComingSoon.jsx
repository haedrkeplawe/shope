// user
/*
  ComingSoon
  - صفحة فارغة مؤقتة لكل روابط الهيدر/القائمة لحد ما نبني محتوى كل صفحة
    فعليًا - بنفس نمط PagePlaceholder.jsx بالأدمن بالضبط
*/
const ComingSoon = ({ title }) => {
  return (
    <div className="coming-soon-page">
      <h1 className="coming-soon-title">{title}</h1>
      <p className="coming-soon-text">هذه الصفحة قيد الإنشاء حاليًا</p>
    </div>
  );
};

export default ComingSoon;

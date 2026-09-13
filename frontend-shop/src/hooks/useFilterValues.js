import { useEffect, useState } from "react";
import { fetchFilterValues } from "../utils/filterValuesCache";

/*
  useFilterValues(key)
  - بيرجع القيم النشطة بس لفلتر معيّن (مثال: useFilterValues("color"))
  - كل قيمة شكلها: { value, label, colorHex }
  - بيستخدم كاش مشترك (filterValuesCache) عشان ميكررش الطلب لكل مكوّن
*/
const useFilterValues = (key) => {
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    fetchFilterValues(key).then((result) => {
      if (!ignore) {
        setValues(result);
        setLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [key]);

  return { values, loading };
};

export default useFilterValues;

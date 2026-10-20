// ملف تشخيص مؤقت - مش جزء من المشروع، بس عشان نلاقي الـ import العاطل
// افتحه بعد ما تستورد كل حاجة في App.js وشغّله زي كده مؤقتًا فوق function App()

import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PagePlaceholder from "./components/PagePlaceholder";
import { NAV_ITEMS } from "./constants/navItems";
import { Toaster } from "react-hot-toast";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";

console.log({
  Login: typeof Login,
  VerifyOtp: typeof VerifyOtp,
  DashboardLayout: typeof DashboardLayout,
  ProtectedRoute: typeof ProtectedRoute,
  PagePlaceholder: typeof PagePlaceholder,
  NAV_ITEMS: Array.isArray(NAV_ITEMS)
    ? `array(${NAV_ITEMS.length})`
    : typeof NAV_ITEMS,
  Toaster: typeof Toaster,
  Routes: typeof Routes,
  Route: typeof Route,
  Outlet: typeof Outlet,
  Navigate: typeof Navigate,
});

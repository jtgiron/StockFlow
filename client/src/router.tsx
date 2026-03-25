import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage.tsx";
import ProductsPage from "./pages/ProductsPage.tsx";
import CategoriesPage from "./pages/CategoriesPage.tsx";
import StockPage from "./pages/StockPage.tsx";
import CashRegisterPage from "./pages/CashRegisterPage.tsx";
import CreditsPage from "./pages/CreditsPage.tsx";
import PriceListsPage from "./pages/PriceListsPage.tsx";
import ReportsPage from "./pages/ReportsPage.tsx";
import UsersPage from "./pages/UsersPage.tsx";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function Router() {
  const loginElement = (
    <AuthGuard>
      <LoginPage />
    </AuthGuard>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={loginElement} />
        <Route path="/login" element={loginElement} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/cash-register" element={<CashRegisterPage />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route
            path="/price-lists"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <PriceListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

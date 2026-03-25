import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types";
import Spinner from "../ui/Spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

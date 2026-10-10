import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui";

/**
 * Route guard: requires login and (optionally) a specific role.
 */
export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role?: "brand" | "creator";
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session…" />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "brand" ? "/brand" : "/creator"} replace />;
  }
  return <>{children}</>;
}

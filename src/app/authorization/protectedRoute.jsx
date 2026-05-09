import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <div style={{ padding: 20 }} className="text-light">Завантаження...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    const userRole = user.role || "client";
    if (!allowed.includes(userRole)) {
      return <Navigate to="/cabinet" replace />;
    }
  }

  return children;
}

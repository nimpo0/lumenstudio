import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  const location = useLocation();
  if (authLoading) {
    return <div style={{ padding: 20 }} className="text-light">Завантаження...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

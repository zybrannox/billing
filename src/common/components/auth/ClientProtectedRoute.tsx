import { Navigate, Outlet } from "react-router-dom";
import { useClientAppStore } from "../../../store/useClientAppStore";

// Mirrors ProtectedRoute.tsx - no allowedRoles array, since a client has no
// role split the way staff does (admin/moderator/user).
export default function ClientProtectedRoute() {
  const { clientUser } = useClientAppStore();

  if (!clientUser) {
    return <Navigate to="/portal/login" replace />;
  }

  return <Outlet />;
}

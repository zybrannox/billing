import { Navigate, Outlet } from "react-router-dom";
import { useAppStore } from "../../../store/useAppStore";

type Props = {
  allowedRoles: Array<"admin" | "modurator" | "user">;
};

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user } = useAppStore();

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role
  if (!allowedRoles.includes(user.role)) {
    // redirect based on role
    return user.role === "admin"
      ? <Navigate to="/admin/projects" replace />
      : <Navigate to="/" replace />;
  }

  return <Outlet />;
}

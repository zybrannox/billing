import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermission } from "../../hooks/usePermission";
import type { Permission } from "../../store/useAppStore";

// Sends someone without this access home, for a link or bookmark to a page they
// no longer have. The server refuses the data either way.
export default function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const allowed = usePermission(permission);
  return allowed ? children : <Navigate to="/" replace />;
}

import { useAppStore, type Permission } from "../store/useAppStore";

// Whether the signed-in person has this access. For showing or hiding things
// only: the server decides for real (see app/auth/permissions.py). Admins come
// back from the server with every permission.
export function usePermission(permission: Permission) {
  return useAppStore((s) => s.user?.permissions?.includes(permission) ?? false);
}

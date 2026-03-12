import type { AuthUser } from "../store/auth.store";

// Legacy fallback: only applies to the original admin account (no custom role assigned).
// Do NOT apply to users who have an intentionally assigned custom role with empty permissions.
const hasLegacyAdminFallback = (user: AuthUser) =>
  user.role === "admin" &&
  !user.customRoleName &&
  (user.permissions ?? []).length === 0;

export const hasPermission = (
  user: AuthUser | null | undefined,
  permission: string,
): boolean => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if ((user.permissions ?? []).includes(permission)) return true;

  // Keep older admin sessions functional until they refresh permission payload.
  return hasLegacyAdminFallback(user);
};

export const hasAnyPermission = (
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean => permissions.some((permission) => hasPermission(user, permission));

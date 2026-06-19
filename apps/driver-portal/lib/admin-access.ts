import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type AdminPermission =
  | "super-admin"
  | "manage-users"
  | "manage-bookings"
  | "view-reports";

export const ADMIN_ROUTE_REQUIREMENTS: Array<{
  prefix: string;
  permission: AdminPermission;
  exact?: boolean;
}> = [
  { prefix: "/admin", permission: "view-reports", exact: true },
  { prefix: "/admin/drivers", permission: "manage-users" },
  { prefix: "/admin/tiers", permission: "manage-users" },
  { prefix: "/admin/trips", permission: "manage-bookings" },
  { prefix: "/admin/administrators", permission: "super-admin" },
];

export function hasAdminPermission(
  permissions: readonly AdminPermission[],
  required: AdminPermission,
): boolean {
  if (permissions.includes("super-admin")) return true;
  return permissions.includes(required);
}

export function getRequiredAdminPermission(
  pathname: string,
): AdminPermission | null {
  for (const rule of ADMIN_ROUTE_REQUIREMENTS) {
    if (rule.exact ? pathname === rule.prefix : pathname.startsWith(rule.prefix)) {
      return rule.permission;
    }
  }
  return null;
}

export function getAdminFallbackPath(
  permissions: readonly AdminPermission[],
): string {
  if (hasAdminPermission(permissions, "view-reports")) return "/admin";
  if (hasAdminPermission(permissions, "manage-users")) return "/admin/drivers";
  if (hasAdminPermission(permissions, "manage-bookings")) return "/admin/trips";
  if (hasAdminPermission(permissions, "super-admin"))
    return "/admin/administrators";
  return "/admin/settings";
}

export function extractAdminPermissionsFromProfile(
  json: unknown,
): AdminPermission[] {
  const payload = json as {
    data?: {
      admin?: { permissions?: unknown };
    };
    admin?: { permissions?: unknown };
  };

  const raw = payload.data?.admin?.permissions ?? payload.admin?.permissions;
  if (!Array.isArray(raw)) return [];

  const allowed = new Set<AdminPermission>([
    "super-admin",
    "manage-users",
    "manage-bookings",
    "view-reports",
  ]);

  return raw.filter((p): p is AdminPermission =>
    typeof p === "string" && allowed.has(p as AdminPermission),
  );
}

export interface CurrentUserProfile {
  name: string;
  role: string;
  avatar: string | null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function fetchAdminPermissions(
  token: string,
): Promise<AdminPermission[]> {
  if (!token || !BASE_URL) return [];

  const res = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    cache: "no-store",
  });

  if (!res.ok) return [];
  const json = await res.json();
  return extractAdminPermissionsFromProfile(json);
}

export async function fetchCurrentUserProfile(
  token: string,
): Promise<CurrentUserProfile> {
  if (!token || !BASE_URL) {
    return { name: "Admin User", role: "Admin", avatar: null };
  }

  const res = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    cache: "no-store",
  });

  if (!res.ok) return { name: "Admin User", role: "Admin", avatar: null };

  const json = await res.json().catch(() => ({}));
  const data = json?.data ?? json;

  const name = toString(data?.name) || "Admin User";
  const roleRaw = toString(data?.role);
  const role = roleRaw
    ? roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1)
    : "Admin";

  const avatar =
    toString(data?.avatar) ||
    toString(data?.profileImage) ||
    toString(data?.admin?.avatar) ||
    null;

  return { name, role, avatar };
}

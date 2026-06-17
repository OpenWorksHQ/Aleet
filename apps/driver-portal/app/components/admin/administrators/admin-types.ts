import type { AdminPermission } from "@/lib/admin-access";

export type AdminRole = "super-admin" | "booking-manager" | "user-manager";

export type AdminRoleConfig = {
  label: string;
  description: string;
  permissions: AdminPermission[];
};

export const ADMIN_ROLES: Record<AdminRole, AdminRoleConfig> = {
  "super-admin": {
    label: "Super Admin",
    description: "Full access to all platform features",
    permissions: [
      "super-admin",
      "manage-users",
      "view-reports",
      "manage-bookings",
    ],
  },
  "booking-manager": {
    label: "Booking Manager",
    description: "Manage bookings and view reports",
    permissions: ["manage-bookings", "view-reports"],
  },
  "user-manager": {
    label: "User Manager",
    description: "Manage users and view reports",
    permissions: ["manage-users", "view-reports"],
  },
};

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  "super-admin": "Super Admin",
  "manage-users": "Manage Users",
  "view-reports": "View Reports",
  "manage-bookings": "Manage Bookings",
};

export const PERMISSION_COLORS: Record<AdminPermission, string> = {
  "super-admin": "border-emerald-500/40 bg-emerald-500/12 text-emerald-300",
  "manage-users": "border-gold/40 bg-gold/10 text-gold",
  "view-reports": "border-gold/40 bg-gold/10 text-gold",
  "manage-bookings": "border-gold/40 bg-gold/10 text-gold",
};

/** Matches the real API response shape */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
};

/** Derive a UI role label from permissions array */
export function getRoleFromPermissions(
  permissions: AdminPermission[],
): AdminRole {
  const has = (p: AdminPermission) => permissions.includes(p);
  if (has("super-admin")) return "super-admin";
  if (has("manage-users") && has("manage-bookings") && has("view-reports"))
    return "super-admin";
  if (has("manage-bookings")) return "booking-manager";
  return "user-manager";
}

/** Derive initials for avatar */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

import type { AdminPermission } from "@/lib/admin-access";

// Static nav config — no "use client" needed, imported by both sidebar & mobile nav

export type NavItem = {
  label: string;
  href: string;
  icon: string; // icon key matched in AdminNavIcon
  badge?: number;
  requiredPermission?: AdminPermission;
};

export const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "dashboard",
    requiredPermission: "view-reports",
  },
  {
    label: "Trip Management",
    href: "/admin/trips",
    icon: "trips",
    requiredPermission: "manage-bookings",
  },
  {
    label: "Driver Management",
    href: "/admin/drivers",
    icon: "drivers",
    requiredPermission: "manage-users",
  },
  {
    label: "Partners",
    href: "/admin/partners",
    icon: "partners",
    requiredPermission: "manage-users",
  },
  {
    label: "Platform",
    href: "/admin/platform",
    icon: "platform",
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "settings",
  },
];

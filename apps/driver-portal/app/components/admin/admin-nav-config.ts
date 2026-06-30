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
    label: "Driver Management",
    href: "/admin/drivers",
    icon: "drivers",
    requiredPermission: "manage-users",
  },
  {
    label: "Trip Management",
    href: "/admin/trips",
    icon: "trips",
    requiredPermission: "manage-bookings",
  },
  { label: "Payouts", href: "/admin/payouts", icon: "payouts" },
  {
    label: "Licensing & Background",
    href: "/admin/licensing",
    icon: "licensing",
  },
  {
    label: "Cancellation Fees",
    href: "/admin/cancellation-fees",
    icon: "cancellation",
  },
  {
    label: "Tiers & Policy",
    href: "/admin/tiers",
    icon: "tiers",
    requiredPermission: "manage-users",
  },
  { label: "Vehicle Types", href: "/admin/vehicle-types", icon: "vehicles" },
  { label: "Add-ons", href: "/admin/addons", icon: "addons" },
  { label: "Regions", href: "/admin/regions", icon: "regions" },
  { label: "Investor Resources", href: "/admin/investor-documents", icon: "investor" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
  {
    label: "Administrators",
    href: "/admin/administrators",
    icon: "administrators",
    requiredPermission: "super-admin",
  },
];

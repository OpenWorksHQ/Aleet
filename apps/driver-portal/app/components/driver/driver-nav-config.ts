export type DriverNavItem = {
  label: string;
  href: string;
  icon: string;
  locked?: boolean;
  badge?: number;
  /** If true, hidden/locked when driver status is not fully approved */
  requiresApproval?: boolean;
};

export const driverNavItems: DriverNavItem[] = [
  {
    label: "Dashboard",
    href: "/driver",
    icon: "dashboard",
    requiresApproval: true,
  },
  { label: "Onboarding", href: "/driver/onboarding", icon: "onboarding" },
  {
    label: "Available Trips",
    href: "/driver/trips",
    icon: "trips",
    requiresApproval: true,
  },
  {
    label: "Earnings & Payouts",
    href: "/driver/earnings",
    icon: "earnings",
    requiresApproval: true,
  },
  { label: "Profile & Documents", href: "/driver/profile", icon: "profile" },
  {
    label: "Bank Account",
    href: "/driver/bank",
    icon: "bank",
    requiresApproval: true,
  },
  {
    label: "Policies & Support",
    href: "/driver/support",
    icon: "support",
    requiresApproval: true,
  },
];

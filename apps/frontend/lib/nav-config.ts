export type NavLink = {
  label: string;
  href: string;
};

export const MARKETING_NAV: NavLink[] = [
  { label: "Membership", href: "/membership" },
  { label: "Business", href: "#" },
  { label: "For Partners", href: "/teams" },
  { label: "About", href: "#" },
];

export const MOBILE_MENU_NAV: NavLink[] = [
  { label: "Membership", href: "/membership" },
  { label: "Book a Trip", href: "/booking" },
  { label: "Investor Resources", href: "/teams" },
  { label: "About", href: "#" },
];

export const DASHBOARD_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "history", label: "Trip History", href: "/trip-history" },
  { key: "book", label: "Book Trip", href: "/booking" },
  { key: "payments", label: "Billing", href: "/billing" },
  { key: "subscription", label: "Membership", href: "/subscription" },
] as const;

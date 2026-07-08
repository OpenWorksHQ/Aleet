import { getDriverPortalLoginUrl } from "./site-url";

export type NavLink = {
  label: string;
  href: string;
  /** Opens in same tab; use for separate apps (driver portal). */
  external?: boolean;
};

export const DRIVER_PORTAL_NAV: NavLink = {
  label: "Driver Portal",
  href: getDriverPortalLoginUrl(),
  external: true,
};

export const MARKETING_NAV: NavLink[] = [
  { label: "Membership", href: "/membership" },
  { label: "Business", href: "#" },
  { label: "For Partners", href: "/partners" },
  DRIVER_PORTAL_NAV,
  { label: "About", href: "#" },
];

export const MOBILE_MENU_NAV: NavLink[] = [
  { label: "Membership", href: "/membership" },
  { label: "Book a Trip", href: "/booking" },
  { label: "For Partners", href: "/partners" },
  DRIVER_PORTAL_NAV,
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

export type MembershipPlan = {
  key: string;
  name: string;
  price: number;
  billedQuarterly: number;
  hours: number;
  memberRate: number;
  features: string[];
  highlight: boolean;
  tag?: string;
  inviteOnly?: boolean;
};

/** Single public offering — Founder 30 is invite-only (backend / admin only). */
export const STANDARD_MEMBERSHIP_PLAN: MembershipPlan = {
  key: "standard",
  name: "Standard Membership",
  price: 449,
  billedQuarterly: 1347,
  hours: 5,
  memberRate: 89,
  features: [
    "Lock in $89/hr — save up to $111/hr on premium vehicles",
    "5 prepaid hours every month (15 hours per quarter)",
    "Any vehicle type at the same member rate",
    "Overage stays at your locked member rate",
  ],
  highlight: true,
  tag: "Member Deal",
};

export const PUBLIC_MEMBERSHIP_PLANS: MembershipPlan[] = [
  STANDARD_MEMBERSHIP_PLAN,
];

/** @deprecated Use PUBLIC_MEMBERSHIP_PLANS */
export const MEMBERSHIP_PLANS = PUBLIC_MEMBERSHIP_PLANS;

export const MEMBERSHIP_SAVINGS = [
  { vehicle: "Black Truck", regularPrice: 150, memberPrice: 89, savings: 61 },
  { vehicle: "Luxury Sedan", regularPrice: 120, memberPrice: 89, savings: 31 },
  {
    vehicle: "Sprinter & Stretch",
    regularPrice: 200,
    memberPrice: 89,
    savings: 111,
  },
];

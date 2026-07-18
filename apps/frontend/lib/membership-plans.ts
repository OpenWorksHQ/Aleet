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

/** Public Standard plan — Founder 30 is invite-only and shown on /subscription when invited. */
export const STANDARD_MEMBERSHIP_PLAN: MembershipPlan = {
  key: "standard",
  name: "Standard Membership",
  price: 445,
  billedQuarterly: 1335,
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

export const FOUNDER30_MEMBERSHIP_PLAN: MembershipPlan = {
  key: "founder30",
  name: "Founder 30",
  price: 345,
  billedQuarterly: 1035,
  hours: 5,
  memberRate: 69,
  features: [
    "Private invite-only rate — $69/hr any vehicle",
    "5 prepaid hours every month (15 hours per quarter)",
    "Same booking benefits as Standard",
    "Overage stays at your Founder rate",
  ],
  highlight: false,
  tag: "Invite only",
  inviteOnly: true,
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

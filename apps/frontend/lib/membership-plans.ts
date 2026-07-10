export type MembershipPlan = {
  key: string;
  name: string;
  price: number;
  billedQuarterly: number;
  hours: number;
  features: string[];
  highlight: boolean;
  tag?: string;
  inviteOnly?: boolean;
};

/** Fallback marketing copy — live rates come from GET /subscriptions/benefits on /subscription. */
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    key: "standard",
    name: "Standard Membership",
    price: 445,
    billedQuarterly: 1335,
    hours: 5,
    features: [
      "5 prepaid hours per month at $89/hr",
      "Any vehicle type at the member rate",
      "Hours pool across the full quarter (15 hrs)",
      "Overage billed at the same member rate",
    ],
    highlight: true,
    tag: "Most Popular",
  },
  {
    key: "founder30",
    name: "Founder 30",
    price: 345,
    billedQuarterly: 1035,
    hours: 5,
    features: [
      "Invite-only membership at $69/hr",
      "5 prepaid hours per month (15/quarter)",
      "Any vehicle type at the Founder rate",
      "Same booking benefits as Standard",
    ],
    highlight: false,
    tag: "Invite only",
    inviteOnly: true,
  },
];

export const MEMBERSHIP_SAVINGS = [
  { vehicle: "Black Truck", regularPrice: 150, memberPrice: 89, savings: 61 },
  { vehicle: "Luxury Sedan", regularPrice: 120, memberPrice: 89, savings: 31 },
  { vehicle: "Sprinter & Stretch", regularPrice: 200, memberPrice: 89, savings: 111 },
];

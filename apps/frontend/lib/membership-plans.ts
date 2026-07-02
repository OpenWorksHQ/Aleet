export type MembershipPlan = {
  key: string;
  name: string;
  price: number;
  billedQuarterly: number;
  hours: number;
  features: string[];
  highlight: boolean;
  tag?: string;
};

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    key: "basic",
    name: "Basic",
    price: 199,
    billedQuarterly: 597,
    hours: 2,
    features: [
      "2 hours per month",
      "Standard member rates",
      "Email support",
      "Access to core vehicle fleet",
    ],
    highlight: false,
  },
  {
    key: "pro",
    name: "Premium Membership",
    price: 449,
    billedQuarterly: 1347,
    hours: 5,
    features: [
      "5 hours per month at locked-in rates",
      "No peak-hour add-ons or extra fees",
      "Priority booking and support",
      "Additional hours at member rates",
    ],
    highlight: true,
    tag: "Most Popular",
  },
  {
    key: "elite",
    name: "Elite",
    price: 799,
    billedQuarterly: 2397,
    hours: 10,
    features: [
      "10 hours per month at locked-in rates",
      "No peak-hour add-ons or extra fees",
      "Dedicated concierge support",
      "Additional hours at member rates",
      "Exclusive vehicle access",
    ],
    highlight: false,
  },
];

export const MEMBERSHIP_SAVINGS = [
  { vehicle: "Black Truck", regularPrice: 150, memberPrice: 89.8, savings: 60 },
  { vehicle: "Luxury Sedan", regularPrice: 120, memberPrice: 89.08, savings: 30 },
  { vehicle: "Sprinter & Stretch", regularPrice: 200, memberPrice: 89.8, savings: 110 },
];

export type PayoutStatus = "ready" | "pending" | "paid" | "on_hold";

export type DriverPayout = {
  id: string;
  driverName: string;
  driverAvatar?: string;
  earnings: number;
  tips: number;
  baseSplit: number;
  deductions: number;
  netPayout: number;
  nextPayoutDay: string;
  status: PayoutStatus;
  stripeAccountId?: string;
  tripsCount: number;
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  ready: "Ready",
  pending: "Pending",
  paid: "Paid",
  on_hold: "On Hold",
};

export const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  ready: "border-gold/40 bg-gold/10 text-gold",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  on_hold: "border-red-500/40 bg-red-500/10 text-red-400",
};

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const mockPayouts: DriverPayout[] = [
  {
    id: "1",
    driverName: "John Smith",
    earnings: 1247.5,
    tips: 374.0,
    baseSplit: 873.5,
    deductions: 15.0,
    netPayout: 1232.5,
    nextPayoutDay: "Friday",
    status: "ready",
    stripeAccountId: "acct_1ABC",
    tripsCount: 18,
  },
  {
    id: "2",
    driverName: "Sarah Johnson",
    earnings: 892.3,
    tips: 267.9,
    baseSplit: 624.4,
    deductions: 25.0,
    netPayout: 867.3,
    nextPayoutDay: "Friday",
    status: "pending",
    stripeAccountId: "acct_2DEF",
    tripsCount: 13,
  },
  {
    id: "3",
    driverName: "Mike Wilson",
    earnings: 1156.8,
    tips: 346.8,
    baseSplit: 810.0,
    deductions: 0,
    netPayout: 1156.8,
    nextPayoutDay: "Friday",
    status: "ready",
    stripeAccountId: "acct_3GHI",
    tripsCount: 16,
  },
  {
    id: "4",
    driverName: "Emily Davis",
    earnings: 540.0,
    tips: 162.0,
    baseSplit: 378.0,
    deductions: 50.0,
    netPayout: 490.0,
    nextPayoutDay: "Friday",
    status: "on_hold",
    tripsCount: 8,
  },
  {
    id: "5",
    driverName: "Carlos Rivera",
    earnings: 2100.0,
    tips: 630.0,
    baseSplit: 1470.0,
    deductions: 0,
    netPayout: 2100.0,
    nextPayoutDay: "Friday",
    status: "paid",
    stripeAccountId: "acct_5JKL",
    tripsCount: 29,
  },
];

export type PayoutStatus = "paid" | "pending" | "processing" | "failed";

export interface DailyEarning {
  date: string;
  trips: number;
  baseEarnings: number;
  tips: number;
  total: number;
  status: PayoutStatus;
}

export interface PayoutMethod {
  id: string;
  type: "bank" | "paypal" | "venmo";
  label: string;
  detail: string;
  isPrimary: boolean;
}

export interface EarningsGoal {
  label: string;
  current: number;
  target: number;
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
};

export const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  processing: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  failed: "border-red-500/30 bg-red-500/10 text-red-400",
};

export const mockDailyEarnings: DailyEarning[] = [
  {
    date: "2026-04-20",
    trips: 8,
    baseEarnings: 145.5,
    tips: 25.0,
    total: 180.5,
    status: "paid",
  },
  {
    date: "2026-04-19",
    trips: 6,
    baseEarnings: 98.75,
    tips: 18.5,
    total: 117.25,
    status: "paid",
  },
  {
    date: "2026-04-18",
    trips: 10,
    baseEarnings: 189.25,
    tips: 32.0,
    total: 236.25,
    status: "paid",
  },
  {
    date: "2026-04-17",
    trips: 7,
    baseEarnings: 125.0,
    tips: 22.75,
    total: 152.75,
    status: "paid",
  },
  {
    date: "2026-04-16",
    trips: 5,
    baseEarnings: 87.5,
    tips: 14.0,
    total: 101.5,
    status: "paid",
  },
  {
    date: "2026-04-15",
    trips: 9,
    baseEarnings: 162.0,
    tips: 29.5,
    total: 203.5,
    status: "processing",
  },
  {
    date: "2026-04-14",
    trips: 4,
    baseEarnings: 68.25,
    tips: 11.0,
    total: 79.25,
    status: "pending",
  },
];

export const mockPayoutMethods: PayoutMethod[] = [
  {
    id: "1",
    type: "bank",
    label: "Bank Account",
    detail: "****1234",
    isPrimary: true,
  },
  {
    id: "2",
    type: "paypal",
    label: "PayPal",
    detail: "john@email.com",
    isPrimary: false,
  },
];

export const mockEarningsGoals: EarningsGoal[] = [
  { label: "Weekly Goal", current: 612, target: 800 },
  { label: "Monthly Goal", current: 2450, target: 3200 },
];

export const mockChartData = [
  { day: "Mon", earnings: 180.5 },
  { day: "Tue", earnings: 117.25 },
  { day: "Wed", earnings: 236.25 },
  { day: "Thu", earnings: 152.75 },
  { day: "Fri", earnings: 101.5 },
  { day: "Sat", earnings: 203.5 },
  { day: "Sun", earnings: 79.25 },
];

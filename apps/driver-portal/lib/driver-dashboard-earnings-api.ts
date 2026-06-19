import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface DriverEarningsTopStats {
  totalEarnings: number;
  weeklyAvg: number;
  weeklyChangePercent: number;
  todayEarnings: number;
  tripsToday: number;
  pendingPayout: number;
}

export interface DriverWeeklyChartPoint {
  day: string;
  date: string;
  earnings: number;
}

export interface DriverDailyBreakdownRow {
  date: string;
  trips: number;
  baseEarnings: number;
  tips: number;
  total: number;
  status: string;
}

export interface DriverGoalsProgress {
  current: number;
  goal: number;
  progressPercent: number;
  remaining: number;
}

export interface DriverWeekBreakdown {
  base: number;
  tips: number;
}

export interface DriverPayoutMethod {
  id: string;
  type: "bank_account" | "paypal" | string;
  label: string | null;
  bankName: string | null;
  last4: string | null;
  paypalEmail: string | null;
  isPrimary: boolean;
}

export interface DriverDashboardEarningsData {
  topStats: DriverEarningsTopStats;
  weeklyChart: DriverWeeklyChartPoint[];
  dailyBreakdown: DriverDailyBreakdownRow[];
  earningsGoals: {
    weekly: DriverGoalsProgress;
    monthly: DriverGoalsProgress;
    thisWeekBreakdown: DriverWeekBreakdown;
  };
  payoutMethods: DriverPayoutMethod[];
  payoutNote: string;
}

export const EMPTY_DRIVER_DASHBOARD_EARNINGS_DATA: DriverDashboardEarningsData = {
  topStats: {
    totalEarnings: 0,
    weeklyAvg: 0,
    weeklyChangePercent: 0,
    todayEarnings: 0,
    tripsToday: 0,
    pendingPayout: 0,
  },
  weeklyChart: [],
  dailyBreakdown: [],
  earningsGoals: {
    weekly: { current: 0, goal: 800, progressPercent: 0, remaining: 800 },
    monthly: { current: 0, goal: 3200, progressPercent: 0, remaining: 3200 },
    thisWeekBreakdown: { base: 0, tips: 0 },
  },
  payoutMethods: [],
  payoutNote:
    "Payouts are processed every Monday. Funds arrive within 1-3 business days depending on your bank.",
};

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeProgress(input: unknown, defaultGoal: number): DriverGoalsProgress {
  const raw = (input ?? {}) as Partial<DriverGoalsProgress>;
  const current = toNumber(raw.current, 0);
  const goal = toNumber(raw.goal, defaultGoal);
  const progress = Math.max(0, Math.min(100, toNumber(raw.progressPercent, 0)));
  const remaining = Math.max(0, toNumber(raw.remaining, Math.max(0, goal - current)));

  return { current, goal, progressPercent: progress, remaining };
}

function normalizeResponse(payload: unknown): DriverDashboardEarningsData {
  const raw = (payload ?? {}) as Partial<DriverDashboardEarningsData>;
  const topStatsRaw = (raw.topStats ?? {}) as Partial<DriverEarningsTopStats>;
  const goalsRaw = (raw.earningsGoals ?? {}) as Partial<
    DriverDashboardEarningsData["earningsGoals"]
  >;

  return {
    topStats: {
      totalEarnings: toNumber(topStatsRaw.totalEarnings, 0),
      weeklyAvg: toNumber(topStatsRaw.weeklyAvg, 0),
      weeklyChangePercent: toNumber(topStatsRaw.weeklyChangePercent, 0),
      todayEarnings: toNumber(topStatsRaw.todayEarnings, 0),
      tripsToday: toNumber(topStatsRaw.tripsToday, 0),
      pendingPayout: toNumber(topStatsRaw.pendingPayout, 0),
    },
    weeklyChart: Array.isArray(raw.weeklyChart)
      ? raw.weeklyChart.map((point) => ({
          day: toString(point?.day),
          date: toString(point?.date),
          earnings: toNumber(point?.earnings, 0),
        }))
      : [],
    dailyBreakdown: Array.isArray(raw.dailyBreakdown)
      ? raw.dailyBreakdown.map((row) => ({
          date: toString(row?.date),
          trips: toNumber(row?.trips, 0),
          baseEarnings: toNumber(row?.baseEarnings, 0),
          tips: toNumber(row?.tips, 0),
          total: toNumber(row?.total, 0),
          status: toString(row?.status, "Pending"),
        }))
      : [],
    earningsGoals: {
      weekly: normalizeProgress(goalsRaw.weekly, 800),
      monthly: normalizeProgress(goalsRaw.monthly, 3200),
      thisWeekBreakdown: {
        base: toNumber(goalsRaw.thisWeekBreakdown?.base, 0),
        tips: toNumber(goalsRaw.thisWeekBreakdown?.tips, 0),
      },
    },
    payoutMethods: Array.isArray(raw.payoutMethods)
      ? raw.payoutMethods.map((method) => ({
          id: toString(method?.id),
          type: toString(method?.type),
          label: toOptionalString(method?.label),
          bankName: toOptionalString(method?.bankName),
          last4: toOptionalString(method?.last4),
          paypalEmail: toOptionalString(method?.paypalEmail),
          isPrimary: Boolean(method?.isPrimary),
        }))
      : [],
    payoutNote: toString(
      raw.payoutNote,
      EMPTY_DRIVER_DASHBOARD_EARNINGS_DATA.payoutNote,
    ),
  };
}

export async function fetchDriverDashboardEarnings(
  token: string,
): Promise<DriverDashboardEarningsData> {
  if (!BASE_URL || !token) return EMPTY_DRIVER_DASHBOARD_EARNINGS_DATA;

  const res = await fetch(`${BASE_URL}/api/dashboard/driver/earnings`, {
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch driver earnings");
  }

  const payload = json.data ?? json;
  return normalizeResponse(payload);
}

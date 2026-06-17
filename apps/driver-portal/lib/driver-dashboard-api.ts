const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type DriverDashboardUrgency = "low" | "due_soon" | "overdue";

export interface DriverDashboardData {
  driver: {
    name: string;
    tier: string;
    status: string;
  };
  overview: {
    todayEarnings: number;
    earningsChangePercent: number;
    tripsCompletedToday: number;
    rating: number;
    totalTrips: number;
  };
  weeklyGoal: {
    current: number;
    goal: number;
    progressPercent: number;
    remaining: number;
  };
  earningsOverview: Array<{
    month: string;
    earnings: number;
  }>;
  pendingItems: Array<{
    type: string;
    label: string;
    amount: number;
    urgency: DriverDashboardUrgency | string;
  }>;
}

const EMPTY_DASHBOARD: DriverDashboardData = {
  driver: { name: "", tier: "", status: "" },
  overview: {
    todayEarnings: 0,
    earningsChangePercent: 0,
    tripsCompletedToday: 0,
    rating: 0,
    totalTrips: 0,
  },
  weeklyGoal: { current: 0, goal: 0, progressPercent: 0, remaining: 0 },
  earningsOverview: [],
  pendingItems: [],
};

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toProgressPercent(current: number, goal: number, provided: number): number {
  if (Number.isFinite(provided)) return Math.max(0, Math.min(100, Math.round(provided)));
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

function normalizeDashboardData(input: unknown): DriverDashboardData {
  const raw = (input ?? {}) as Partial<DriverDashboardData>;
  const current = toNumber(raw.weeklyGoal?.current, 0);
  const goal = toNumber(raw.weeklyGoal?.goal, 0);
  const progressProvided = toNumber(raw.weeklyGoal?.progressPercent, NaN);
  const remainingProvided = toNumber(raw.weeklyGoal?.remaining, NaN);

  return {
    driver: {
      name: toString(raw.driver?.name),
      tier: toString(raw.driver?.tier),
      status: toString(raw.driver?.status),
    },
    overview: {
      todayEarnings: toNumber(raw.overview?.todayEarnings, 0),
      earningsChangePercent: toNumber(raw.overview?.earningsChangePercent, 0),
      tripsCompletedToday: toNumber(raw.overview?.tripsCompletedToday, 0),
      rating: toNumber(raw.overview?.rating, 0),
      totalTrips: toNumber(raw.overview?.totalTrips, 0),
    },
    weeklyGoal: {
      current,
      goal,
      progressPercent: toProgressPercent(current, goal, progressProvided),
      remaining: Number.isFinite(remainingProvided)
        ? Math.max(0, remainingProvided)
        : Math.max(0, goal - current),
    },
    earningsOverview: Array.isArray(raw.earningsOverview)
      ? raw.earningsOverview.map((item) => ({
          month: toString(item?.month),
          earnings: toNumber(item?.earnings, 0),
        }))
      : [],
    pendingItems: Array.isArray(raw.pendingItems)
      ? raw.pendingItems.map((item) => ({
          type: toString(item?.type),
          label: toString(item?.label),
          amount: toNumber(item?.amount, 0),
          urgency: toString(item?.urgency),
        }))
      : [],
  };
}

export async function fetchDriverDashboard(
  token: string,
): Promise<DriverDashboardData> {
  if (!BASE_URL || !token) return EMPTY_DASHBOARD;

  const res = await fetch(`${BASE_URL}/api/dashboard/driver`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch driver dashboard");
  }

  const payload = json.data ?? json;
  return normalizeDashboardData(payload);
}

import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((c) => c.startsWith("auth_token="))
          ?.split("=")[1]
      : undefined;

  return withNgrokHeaders({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

export type RevenueReport = {
  range: { startDate: string | null; endDate: string | null; status: string };
  totalTrips: number;
  totalRevenue: number;
  totalBookingFees: number;
  totalDriverPayouts: number;
  totalCompanyCostAbsorption: number;
  totalTips: number;
  companyNetRevenue: number;
  byTier: Record<
    string,
    { trips: number; revenue: number; driverPayouts: number; companyRevenue: number }
  >;
};

export type PayoutBreakdown = {
  bookingId: string;
  driver: { id: string; name: string; tier: string } | null;
  finalPrice: number;
  bookingFee: number;
  payoutRate: number;
  keepsBookingFee: boolean;
  vehicleCostDeduction: number;
  companyCostAbsorption: number;
  driverPayout: number;
  companyRevenue: number;
  tip: number;
};

export async function fetchRevenueReportClient(params?: {
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<RevenueReport> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set("startDate", params.startDate);
  if (params?.endDate) qs.set("endDate", params.endDate);
  if (params?.status) qs.set("status", params.status);
  const url = `${BASE_URL}/api/admin/finance/revenue${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" });
  return handleResponse<RevenueReport>(res);
}

export async function fetchPayoutBreakdownClient(bookingId: string): Promise<PayoutBreakdown> {
  const res = await fetch(`${BASE_URL}/api/admin/finance/bookings/${bookingId}/payout-breakdown`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse<PayoutBreakdown>(res);
}

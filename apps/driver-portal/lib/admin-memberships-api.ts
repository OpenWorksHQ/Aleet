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

export type AdminMember = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  isFounder30: boolean;
  ratePerHour: number;
  quarterlyHours: number;
  hoursUsed: number;
  hoursRemaining: number;
  overageHours: number;
  overageCharge: number;
  nextBillingDate: string | null;
  startDate: string | null;
  savedCardLast4: string | null;
};

export type MembershipsPage = {
  members: AdminMember[];
  pagination: { total: number; page: number; limit: number; pages: number };
};

export async function fetchMembershipsClient(params?: {
  plan?: "all" | "standard" | "founder30";
  page?: number;
  limit?: number;
}): Promise<MembershipsPage> {
  const qs = new URLSearchParams();
  if (params?.plan) qs.set("plan", params.plan);
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const url = `${BASE_URL}/api/admin/memberships${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to load memberships");
  }
  return {
    members: (json.data ?? []) as AdminMember[],
    pagination: {
      total: json.meta?.total ?? 0,
      page: json.meta?.page ?? 1,
      limit: json.meta?.limit ?? 20,
      pages: json.meta?.pages ?? 1,
    },
  };
}

export async function inviteFounder30Client(userId: string, invited = true) {
  const res = await fetch(`${BASE_URL}/api/admin/memberships/invite-founder30/${userId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ invited }),
  });
  return handleResponse<{ userId: string; founder30Invited: boolean }>(res);
}

export async function chargeMemberOverageClient(userId: string, overageHours: number) {
  const res = await fetch(`${BASE_URL}/api/admin/memberships/${userId}/charge-overage`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ overageHours }),
  });
  return handleResponse<{ userId: string; amountCharged: number; overageHours: number }>(res);
}

export async function updateMemberBalanceClient(
  userId: string,
  body: { yearMonth: string; totalHoursUsed: number },
) {
  const res = await fetch(`${BASE_URL}/api/admin/memberships/${userId}/balance`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

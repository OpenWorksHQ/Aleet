import type { DriverPayoutMethod } from "@/lib/driver-dashboard-earnings-api";
import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type CreatePayoutMethodPayload =
  {
    type: "paypal";
    label?: string;
    paypalEmail: string;
  };

export type StripeStatus = "not_started" | "active" | "pending" | "error";

export interface StripeStatusDetails {
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  requirements_due: string[];
  eventually_due: string[];
  disabled_reason: string | null;
}

export interface StripeStatusResponse {
  connected: boolean;
  status: StripeStatus;
  stripeAccountId?: string;
  details?: StripeStatusDetails;
  message?: string;
}

export interface StripeConnectResponse {
  onboardingUrl: string;
  stripeAccountId: string;
}

function getClientToken(): string {
  return typeof document !== "undefined"
    ? (document.cookie
        .split("; ")
        .find((c) => c.startsWith("auth_token="))
        ?.split("=")[1] ?? "")
    : "";
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizePayoutMethod(raw: unknown): DriverPayoutMethod {
  const item = raw as {
    id?: unknown;
    _id?: unknown;
    type?: unknown;
    label?: unknown;
    bankName?: unknown;
    last4?: unknown;
    paypalEmail?: unknown;
    email?: unknown;
    accountLast4?: unknown;
    isPrimary?: unknown;
  };

  return {
    id: toString(item.id) || toString(item._id),
    type: toString(item.type),
    label: toOptionalString(item.label),
    bankName: toOptionalString(item.bankName),
    last4:
      toOptionalString(item.last4) ??
      toOptionalString(item.accountLast4) ??
      null,
    paypalEmail:
      toOptionalString(item.paypalEmail) ?? toOptionalString(item.email),
    isPrimary: Boolean(item.isPrimary),
  };
}

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? fallbackMessage);
  }
  return (json.data ?? json) as T;
}

function normalizeStripeStatus(raw: unknown): StripeStatusResponse {
  const data = raw as {
    connected?: unknown;
    status?: unknown;
    stripeAccountId?: unknown;
    message?: unknown;
    details?: {
      details_submitted?: unknown;
      payouts_enabled?: unknown;
      charges_enabled?: unknown;
      requirements_due?: unknown;
      eventually_due?: unknown;
      disabled_reason?: unknown;
    };
  };

  const statusValue = toString(data.status) as StripeStatus;
  const status: StripeStatus = ["not_started", "active", "pending", "error"].includes(
    statusValue,
  )
    ? statusValue
    : "error";

  return {
    connected: Boolean(data.connected),
    status,
    stripeAccountId: toString(data.stripeAccountId) || undefined,
    message: toString(data.message) || undefined,
    details: data.details
      ? {
          details_submitted: Boolean(data.details.details_submitted),
          payouts_enabled: Boolean(data.details.payouts_enabled),
          charges_enabled: Boolean(data.details.charges_enabled),
          requirements_due: Array.isArray(data.details.requirements_due)
            ? data.details.requirements_due
                .map((v) => toString(v))
                .filter(Boolean)
            : [],
          eventually_due: Array.isArray(data.details.eventually_due)
            ? data.details.eventually_due
                .map((v) => toString(v))
                .filter(Boolean)
            : [],
          disabled_reason: toOptionalString(data.details.disabled_reason),
        }
      : undefined,
  };
}

export async function fetchStripeStatusClient(): Promise<StripeStatusResponse> {
  const token = getClientToken();
  if (!BASE_URL || !token) {
    return {
      connected: false,
      status: "not_started",
      message: "Missing auth token",
    };
  }

  const res = await fetch(`${BASE_URL}/api/bank-accounts/stripe/status`, {
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch Stripe status");
  }
  return normalizeStripeStatus(json.data ?? json);
}

export async function connectStripeClient(): Promise<StripeConnectResponse> {
  const token = getClientToken();
  if (!BASE_URL || !token) {
    throw new Error("Missing auth token");
  }

  const res = await fetch(`${BASE_URL}/api/bank-accounts/stripe/connect`, {
    method: "POST",
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });

  const data = await parseResponse<{
    onboardingUrl?: string;
    stripeAccountId?: string;
  }>(res, "Failed to start Stripe onboarding");

  const onboardingUrl = toString(data.onboardingUrl);
  const stripeAccountId = toString(data.stripeAccountId);
  if (!onboardingUrl) {
    throw new Error("Stripe onboarding URL is missing");
  }

  return { onboardingUrl, stripeAccountId };
}

export async function listPayoutMethodsClient(): Promise<DriverPayoutMethod[]> {
  const token = getClientToken();
  if (!BASE_URL || !token) return [];

  const res = await fetch(`${BASE_URL}/api/bank-accounts`, {
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    cache: "no-store",
  });

  const data = await parseResponse<unknown>(res, "Failed to load payout methods");
  if (!Array.isArray(data)) return [];
  return data.map(normalizePayoutMethod);
}

export async function createPayoutMethodClient(
  payload: CreatePayoutMethodPayload,
): Promise<DriverPayoutMethod> {
  const token = getClientToken();
  if (!BASE_URL || !token) {
    throw new Error("Missing auth token");
  }

  const body = {
    label: payload.label,
    paypalEmail: payload.paypalEmail,
  };

  const res = await fetch(`${BASE_URL}/api/bank-accounts`, {
    method: "POST",
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(body),
  });

  const data = await parseResponse<unknown>(res, "Failed to add payout method");
  return normalizePayoutMethod(data);
}

export async function setPrimaryPayoutMethodClient(id: string): Promise<void> {
  const token = getClientToken();
  if (!BASE_URL || !token) {
    throw new Error("Missing auth token");
  }

  const res = await fetch(`${BASE_URL}/api/bank-accounts/${id}/set-primary`, {
    method: "PATCH",
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });

  await parseResponse<unknown>(res, "Failed to set primary payout method");
}

export async function deletePayoutMethodClient(id: string): Promise<void> {
  const token = getClientToken();
  if (!BASE_URL || !token) {
    throw new Error("Missing auth token");
  }

  const res = await fetch(`${BASE_URL}/api/bank-accounts/${id}`, {
    method: "DELETE",
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });

  await parseResponse<unknown>(res, "Failed to delete payout method");
}

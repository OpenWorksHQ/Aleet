import { apiFetch, ApiError } from "@/lib/api";
import { withNgrokHeaders } from "@/lib/ngrok-headers";
import { getToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export type SetupIntentData = {
  clientSecret: string;
  customerId: string;
};

export type BookingPaymentIntentData = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
};

export type ChargeSavedCardResult = {
  paymentIntentId: string;
  amountCharged?: number;
  clientSecret?: string;
  status: string;
  booking?: {
    id: string;
    paymentStatus: string;
    finalPrice: number;
    tip: number;
  };
};

export type CheckoutSessionResult = {
  success: boolean;
  url: string;
  sessionId: string;
  message?: string;
};

export type PaymentSessionStatus = {
  success: boolean;
  session: {
    id: string;
    payment_status: string;
    status: string;
  };
  booking: {
    id: string;
    paymentStatus: string;
    finalPrice: number;
    tip: number;
    status: string;
  } | null;
};

function authHeaders(token?: string): HeadersInit {
  const t = token ?? getToken();
  return withNgrokHeaders({
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  });
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new ApiError(res.status, json.message ?? "Request failed", json.errors);
  }
  return json as T;
}

export function createSetupIntent(token?: string) {
  return apiFetch<SetupIntentData>("/payments/setup-intent", {
    method: "POST",
    token,
  });
}

export function listSavedCards(token?: string) {
  return apiFetch<SavedCard[]>("/payments/saved-cards", { token });
}

export function createBookingPaymentIntent(
  body: { bookingId: string; tip?: number },
  token?: string,
) {
  return apiFetch<BookingPaymentIntentData>("/payments/booking-payment-intent", {
    method: "POST",
    body,
    token,
  });
}

export function confirmBookingPayment(paymentIntentId: string, token?: string) {
  return apiFetch<{
    paymentIntentId: string;
    bookingId: string;
    paymentStatus: string;
  }>("/payments/confirm-booking-payment", {
    method: "POST",
    body: { paymentIntentId },
    token,
  });
}

export function setDefaultCard(paymentMethodId: string, token?: string) {
  return apiFetch<{ paymentMethodId: string }>("/payments/set-default-card", {
    method: "POST",
    body: { paymentMethodId },
    token,
  });
}

export function deleteSavedCard(paymentMethodId: string, token?: string) {
  return apiFetch<{ paymentMethodId: string }>(`/payments/saved-cards/${paymentMethodId}`, {
    method: "DELETE",
    token,
  });
}

export async function chargeSavedCard(
  body: { bookingId: string; paymentMethodId: string; tip?: number },
  token?: string,
): Promise<ChargeSavedCardResult> {
  const res = await fetch(`${BASE_URL}/api/payments/charge-saved-card`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new ApiError(res.status, json.message ?? "Payment failed", json.errors);
  }
  return (json.data ?? json) as ChargeSavedCardResult;
}

/** Stripe Checkout redirect — response is top-level, not wrapped in `data`. */
export async function createCheckoutSession(
  body: { bookingId: string; tip?: number },
  token?: string,
): Promise<CheckoutSessionResult> {
  const res = await fetch(`${BASE_URL}/api/payments/checkout-session`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<CheckoutSessionResult>(res);
}

/** Verify checkout session after redirect — top-level response. */
export async function getPaymentSessionStatus(sessionId: string): Promise<PaymentSessionStatus> {
  const res = await fetch(`${BASE_URL}/api/payments/session/${sessionId}`, {
    headers: withNgrokHeaders({ "Content-Type": "application/json" }),
  });
  return parseJson<PaymentSessionStatus>(res);
}

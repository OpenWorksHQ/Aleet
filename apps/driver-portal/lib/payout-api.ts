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

export type PayoutResult = {
  ok: boolean;
  bookingId: string;
  amountCents: number;
  currency: string;
  transferId: string;
  mode?: string;
};

export async function payoutBookingClient(bookingId: string): Promise<PayoutResult> {
  const res = await fetch(`${BASE_URL}/api/payout/booking/${bookingId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(json.message ?? json.error ?? "Payout failed");
  }
  return json as PayoutResult;
}

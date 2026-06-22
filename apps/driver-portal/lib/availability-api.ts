import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type AvailabilityStatus = "off" | "available" | "on_call";

export interface AvailabilityState {
  status: AvailabilityStatus;
  updatedAt: string | null;
  lastHeartbeatAt: string | null;
  countsForAqd: boolean;
  heartbeatTimeoutMinutes: number;
}

function readAuthToken(): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("auth_token="))
      ?.split("=")[1] ?? ""
  );
}

export async function fetchMyAvailability(): Promise<AvailabilityState | null> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return null;

  const res = await fetch(`${BASE_URL}/api/users/me/availability`, {
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.data ?? json) as AvailabilityState;
}

export async function updateMyAvailability(
  status: AvailabilityStatus,
): Promise<AvailabilityState | null> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return null;

  const res = await fetch(`${BASE_URL}/api/users/me/availability`, {
    method: "PATCH",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.data ?? json) as AvailabilityState;
}

/** Liveness ping while available/on_call — works in background tabs. */
export async function sendAvailabilityHeartbeat(): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/heartbeat`, {
    method: "POST",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

/** Logout or go unavailable. */
export async function sendPresenceOffline(): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/offline`, {
    method: "POST",
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    keepalive: true,
  }).catch(() => {
    /* best-effort */
  });
}

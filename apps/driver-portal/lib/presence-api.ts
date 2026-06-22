import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function readAuthToken(): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("auth_token="))
      ?.split("=")[1] ?? ""
  );
}

/** POST /api/users/me/presence/heartbeat — HTTP fallback when socket cannot send. */
export async function sendPresenceHeartbeat(): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/heartbeat`, {
    method: "POST",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ background: false }),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

/** POST background heartbeat — 5 min AQD grace (mobile app switch fallback). */
export async function sendPresenceBackground(): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/heartbeat`, {
    method: "POST",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ background: true }),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

/** POST /api/users/me/presence/offline — explicit logout only. */
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

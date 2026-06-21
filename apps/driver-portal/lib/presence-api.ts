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

type HeartbeatOptions = {
  /** True when the tab is backgrounded (app switch) — extends server TTL to ~45 min. */
  background?: boolean;
};

/** POST /api/users/me/presence/heartbeat — extends presenceUntil on the server. */
export async function sendPresenceHeartbeat(options: HeartbeatOptions = {}): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/heartbeat`, {
    method: "POST",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ background: options.background === true }),
    keepalive: true,
  }).catch(() => {
    /* ignore — next interval will retry */
  });
}

/** POST /api/users/me/presence/offline — explicit logout. */
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

/**
 * Best-effort offline when the tab/browser closes.
 * Uses sendBeacon (works on mobile Safari/Chrome unload) + fetch keepalive fallback.
 * Never call on visibility:hidden alone — that is app background, not close.
 */
export function sendPresenceOfflineOnPageClose(): void {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  const url = `${BASE_URL}/api/users/me/presence/offline?token=${encodeURIComponent(token)}`;

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, new Blob([], { type: "text/plain" }));
  }

  fetch(url, {
    method: "POST",
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    keepalive: true,
  }).catch(() => {
    /* page unloading */
  });
}

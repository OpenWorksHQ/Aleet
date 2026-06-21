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

/** POST /api/users/me/presence/heartbeat — bumps lastSeenAt (AQD signal). */
export async function sendPresenceHeartbeat(): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/heartbeat`, {
    method: "POST",
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    keepalive: true,
  }).catch(() => {
    /* ignore — next interval or reconnect will retry */
  });
}

/** POST /api/users/me/presence/offline — logout or browser tab closed; drops from AQD. */
export async function sendPresenceOffline(): Promise<void> {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  await fetch(`${BASE_URL}/api/users/me/presence/offline`, {
    method: "POST",
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    keepalive: true,
  }).catch(() => {
    /* best-effort before cookie clear */
  });
}

/**
 * Best-effort offline signal when the tab/browser is closing.
 * Uses fetch keepalive (supports Authorization). Do NOT call on visibility
 * hidden — that is app background (WhatsApp), not logout.
 */
export function sendPresenceOfflineOnPageClose(): void {
  const token = readAuthToken();
  if (!BASE_URL || !token) return;

  fetch(`${BASE_URL}/api/users/me/presence/offline`, {
    method: "POST",
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    keepalive: true,
  }).catch(() => {
    /* page is unloading — best effort only */
  });
}

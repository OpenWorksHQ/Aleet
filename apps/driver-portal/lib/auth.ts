import { withNgrokHeaders } from "@aleet/shared";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The only cookie that carries authority. Verified server-side in lib/session.ts. */
export const AUTH_TOKEN_COOKIE = "auth_token";

/**
 * Legacy client-written cookies. They used to gate routing in proxy.ts, which
 * meant anyone could grant themselves the admin shell from devtools. Nothing
 * reads them any more — they are only cleared, so stale copies in existing
 * browsers disappear.
 */
export const LEGACY_ROLE_COOKIE = "auth_role";
export const LEGACY_DRIVER_STATUS_COOKIE = "driver_status";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/*
 * TODO(security): the auth token lives in a JavaScript-readable cookie, so any
 * XSS on this origin can exfiltrate the session. Fixing this properly requires
 * a BACKEND change: `POST /api/auth/login`, the driver signup completion
 * endpoint and the logout endpoint must issue the token via
 * `Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`
 * (and clear it with `Max-Age=0`) instead of returning it in the JSON body.
 * Once that ships, the helpers below become no-ops/removals and every
 * `Authorization: Bearer` call in lib/*-api.ts switches to `credentials:
 * "include"`. Until then the attributes below are the most we can do client-side.
 */
function cookieAttributes(maxAgeSeconds: number): string {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  return `path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/** Persists the session token. The single place this app writes it. */
export function setAuthToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(TOKEN_MAX_AGE_SECONDS)}`;
}

/** Reads the session token on the client. Server code should use `cookies()`. */
export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Clears the session (and any legacy role/status cookies) on sign-out. */
export function clearAuthSession(): void {
  if (typeof document === "undefined") return;
  const expired = cookieAttributes(0);
  for (const name of [
    AUTH_TOKEN_COOKIE,
    LEGACY_ROLE_COOKIE,
    LEGACY_DRIVER_STATUS_COOKIE,
  ]) {
    document.cookie = `${name}=; ${expired}`;
  }
}

export interface LoginResult {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    driver?: { status: string };
  };
}

export interface ProfileResult {
  role: string;
  driver?: { status: string };
}

export async function fetchUserProfile(token: string): Promise<ProfileResult> {
  const res = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to fetch profile");

  const data = json.data ?? json;
  return {
    role: (data.role ?? "").toLowerCase(),
    driver: data.driver,
  };
}

export async function loginWithIdentifier(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: withNgrokHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ identifier, password, expectedRole: "driver" }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message ?? "Login failed");
  }

  // API returns { token, user } directly at the root (not wrapped in `data`)
  const payload = json.data ?? json;

  if (!payload.token || !payload.user) {
    throw new Error(json.message ?? "Login failed");
  }

  return payload as LoginResult;
}

/**
 * Server-side session verification.
 *
 * The authorization boundary for this app. Role, driver status and admin
 * permissions are derived from the backend using the `auth_token` cookie —
 * never from separate cookies, which client-side JavaScript (and therefore
 * anyone with devtools) can write.
 *
 * Runs in both the proxy (edge-ish runtime) and Server Components, so it must
 * stay free of Node-only APIs — `fetch` only, no JWT libraries.
 */
import { withNgrokHeaders } from "@aleet/shared";
import {
  extractAdminPermissionsFromProfile,
  type AdminPermission,
} from "@/lib/admin-access";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface VerifiedSession {
  /** Lower-cased role as reported by the backend ("driver" | "admin" | ...). */
  role: string;
  /** Driver application status, "" for non-drivers. */
  driverStatus: string;
  adminPermissions: AdminPermission[];
  name: string;
  avatar: string | null;
}

export type SessionResult =
  /** No token, or a token the backend rejected. Safe to clear the cookie. */
  | { status: "anonymous" }
  /** Backend unreachable / erroring. Fail closed, but keep the cookie. */
  | { status: "unavailable" }
  | { status: "authenticated"; session: VerifiedSession };

const ANONYMOUS: SessionResult = { status: "anonymous" };
const UNAVAILABLE: SessionResult = { status: "unavailable" };

/**
 * Short-lived positive/negative cache keyed by token.
 *
 * The proxy runs on every protected navigation, so without this a single page
 * view (document + client-side navigations) would cost several profile
 * round-trips. The TTL is deliberately small so an admin approving/rejecting a
 * driver takes effect within seconds.
 */
const CACHE_TTL_MS = 10_000;
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  expiresAt: number;
  result: SessionResult;
}

const cache = new Map<string, CacheEntry>();

function readCache(token: string): SessionResult | null {
  const entry = cache.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(token);
    return null;
  }
  return entry.result;
}

function writeCache(token: string, result: SessionResult): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
    // Still full of live entries — drop the oldest insertion.
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
  }
  cache.set(token, { expiresAt: Date.now() + CACHE_TTL_MS, result });
}

/** Forget a cached verification (e.g. right after a status-changing action). */
export function invalidateSession(token: string): void {
  cache.delete(token);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Decodes a JWT payload WITHOUT verifying its signature.
 *
 * UNTRUSTED. The result is only ever used to *deny* early (skip a network call
 * for a token we already know is expired). It must never be used to grant
 * access or to determine a role — that always comes from the backend.
 */
function decodeUntrustedJwtPayload(
  token: string,
): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return asRecord(JSON.parse(atob(padded)));
  } catch {
    return null;
  }
}

/** True only when the token self-reports an expiry that has already passed. */
function isObviouslyExpired(token: string): boolean {
  const payload = decodeUntrustedJwtPayload(token);
  if (!payload) return false;
  const exp = payload.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 <= Date.now();
}

function toSession(json: unknown): VerifiedSession | null {
  const root = asRecord(json);
  if (!root) return null;

  const data = asRecord(root.data) ?? root;
  const role = asString(data.role).toLowerCase();
  if (!role) return null;

  const driver = asRecord(data.driver);
  const admin = asRecord(data.admin);

  return {
    role,
    driverStatus: driver ? asString(driver.status) : "",
    adminPermissions: extractAdminPermissionsFromProfile(json),
    name: asString(data.name),
    avatar:
      asString(data.avatar) ||
      asString(data.profileImage) ||
      (admin ? asString(admin.avatar) : "") ||
      null,
  };
}

/**
 * Verifies `token` against the backend and returns the caller's real role,
 * driver status and admin permissions.
 */
export async function getSession(
  token: string | null | undefined,
): Promise<SessionResult> {
  if (!token || !BASE_URL) return ANONYMOUS;
  if (isObviouslyExpired(token)) return ANONYMOUS;

  const cached = readCache(token);
  if (cached) return cached;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
      cache: "no-store",
    });
  } catch {
    return UNAVAILABLE;
  }

  if (res.status === 401 || res.status === 403) {
    writeCache(token, ANONYMOUS);
    return ANONYMOUS;
  }
  if (!res.ok) return UNAVAILABLE;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return UNAVAILABLE;
  }

  const session = toSession(json);
  if (!session) return UNAVAILABLE;

  const result: SessionResult = { status: "authenticated", session };
  writeCache(token, result);
  return result;
}

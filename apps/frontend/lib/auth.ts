export const TOKEN_COOKIE = "auth_token";
export const AUTH_CHANGED_EVENT = "aleet-auth-changed";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/*
 * TODO(security): the auth token is stored in a JavaScript-readable cookie, so
 * any XSS on this origin can exfiltrate the session. Closing that hole requires
 * a BACKEND change: `POST /api/auth/login` (and the logout endpoint) must issue
 * the token as
 * `Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`
 * (cleared with `Max-Age=0`) instead of returning it in the JSON body. Once
 * that ships, `setToken`/`removeToken` become no-ops (the browser owns the
 * cookie) and the `Authorization: Bearer` calls in lib/api.ts switch to
 * `credentials: "include"`. Until then, the attributes below are the strongest
 * protection available from the client.
 *
 * Every read/write of this cookie must go through the helpers in this file so
 * that the migration stays a one-file change.
 */
function cookieAttributes(maxAgeSeconds: number): string {
  // `Secure` would make the cookie unusable over plain http on localhost, so it
  // is only applied when the page itself is served over https.
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  return `path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function setToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(TOKEN_MAX_AGE_SECONDS)}`;
  notifyAuthChanged();
}

export function removeToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; ${cookieAttributes(0)}`;
  notifyAuthChanged();
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

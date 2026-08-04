/**
 * Token-stamped URLs for the protected `/uploads` route.
 *
 * `/uploads/*` on the API is no longer public (see backend
 * `middleware/protectedUploads.js`): general files need any valid JWT and
 * `/uploads/investor/*` needs an admin JWT, except documents flagged
 * `isPublished`, which stay anonymous for the public /teams page.
 *
 * Browsers cannot attach an `Authorization` header to `<img src>`, `<a href>`
 * or a download, so that middleware — and only that middleware — also accepts
 * the JWT as a `?token=` query parameter. This helper is the single place that
 * appends it.
 *
 * Scope guard: the token is added ONLY to `/uploads/...` paths that are
 * relative or that live on our own API origin. `blob:`/`data:` previews,
 * third-party URLs and S3 object URLs (also served under `/uploads/`, but not
 * gated by the middleware) are returned untouched, so a session token can never
 * leak to another host.
 */
import { getAuthToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const UPLOADS_PREFIX = "/uploads/";

/** Origin of the API that serves `/uploads`, or null when it can't be resolved. */
function apiOrigin(): string | null {
  const base = API_BASE_URL.trim();
  if (base) {
    try {
      return new URL(base).origin;
    } catch {
      return null;
    }
  }
  // Same-origin deployment (no NEXT_PUBLIC_API_URL): uploads come from this host.
  return typeof location !== "undefined" ? location.origin : null;
}

/** True only for URLs the backend upload gate will actually see. */
function isProtectedUploadUrl(url: string): boolean {
  // Relative path — always resolved against the API (directly or via a rewrite).
  if (url.startsWith(UPLOADS_PREFIX)) return true;
  // Anything else non-absolute (including `blob:` and `data:` previews) is local.
  if (!/^https?:\/\//i.test(url)) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!parsed.pathname.startsWith(UPLOADS_PREFIX)) return false;

  const origin = apiOrigin();
  return origin !== null && parsed.origin === origin;
}

/**
 * Returns `url` with the caller's JWT appended as `?token=`.
 *
 * Returns the URL unchanged when there is no token, when it is empty, or when
 * it does not point at the protected upload route.
 *
 * @param url   the URL to stamp (relative `/uploads/...` or absolute API URL)
 * @param token explicit token — required in Server Components, which cannot
 *              read `document.cookie`; read it with `cookies()` from
 *              `next/headers` and pass it in. Omit on the client and the
 *              session cookie is used.
 */
export function withUploadToken(
  url: string | null | undefined,
  token?: string | null,
): string {
  if (!url) return "";
  if (!isProtectedUploadUrl(url)) return url;

  const authToken = token === undefined ? getAuthToken() : token;
  if (!authToken) return url;

  const hashIndex = url.indexOf("#");
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);

  // Already stamped (e.g. a value round-tripped through state) — leave it.
  if (/[?&]token=/.test(withoutHash)) return url;

  const separator = withoutHash.includes("?") ? "&" : "?";
  return `${withoutHash}${separator}token=${encodeURIComponent(authToken)}${hash}`;
}

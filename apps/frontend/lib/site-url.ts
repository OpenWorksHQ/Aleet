/** Production canonical host — always www (matches GSC primary property). */
const CANONICAL_SITE_URL = "https://www.aleet.app";

function normalizeCanonicalHost(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "aleet.app") {
      parsed.hostname = "www.aleet.app";
    }
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return CANONICAL_SITE_URL;
  }
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    return CANONICAL_SITE_URL;
  }

  return normalizeCanonicalHost(raw.replace(/\/+$/, ""));
}

/** Production driver portal host. */
const CANONICAL_DRIVER_PORTAL_URL = "https://portal.aleet.app";
const LOCAL_DRIVER_PORTAL_URL = "http://localhost:3002";

function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getDriverPortalUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_DRIVER_PORTAL_URL?.trim();
  if (explicit) return normalizeOrigin(explicit);

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (site.includes("localhost") || site.includes("127.0.0.1")) {
    return LOCAL_DRIVER_PORTAL_URL;
  }

  return CANONICAL_DRIVER_PORTAL_URL;
}

export function getDriverPortalLoginUrl(): string {
  return `${getDriverPortalUrl()}/login`;
}

export function getPartnerDashboardUrl(): string {
  return `${getSiteUrl()}/partners/dashboard`;
}

export function getPartnerLoginUrl(): string {
  return `${getSiteUrl()}/partners/login`;
}

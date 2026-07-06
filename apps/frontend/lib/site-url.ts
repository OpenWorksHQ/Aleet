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

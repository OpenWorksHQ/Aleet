const FALLBACK_SITE_URL = "https://aleet.app";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    FALLBACK_SITE_URL;

  return raw.replace(/\/+$/, "");
}

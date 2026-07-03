const FALLBACK_SITE_URL = "https://aleet.app";
const DEV_CUSTOMER_SITE_URL = "http://localhost:3001";

/** Driver portal / admin app URL (sitemap, robots, etc.). */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    FALLBACK_SITE_URL;

  return raw.replace(/\/+$/, "");
}

/** Customer-facing booking site — partner links, QR codes, invisible links. */
export function getCustomerSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    (process.env.NODE_ENV === "development" ? DEV_CUSTOMER_SITE_URL : FALLBACK_SITE_URL);

  return raw.replace(/\/+$/, "");
}

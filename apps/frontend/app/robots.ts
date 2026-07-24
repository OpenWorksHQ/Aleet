import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/billing",
          "/subscription",
          "/trip-history",
          "/teams",
          "/checkout",
          "/booking-success",
          "/subscription-success",
          "/partners/login",
          "/partners/dashboard",
          "/partners/forgot-password",
          "/partners/reset-password",
          "/partners/accept-invite",
          "/access/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

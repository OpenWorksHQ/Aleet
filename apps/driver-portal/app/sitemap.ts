import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}

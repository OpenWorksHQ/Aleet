import type { Metadata } from "next";
import { getSiteUrl } from "./site-url";

type PageMetadataOptions = {
  path: string;
  title?: string;
  description?: string;
  robots?: Metadata["robots"];
};

/** Build page metadata with an explicit canonical URL on the www host. */
export function createPageMetadata({
  path,
  title,
  description,
  robots,
}: PageMetadataOptions): Metadata {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonical =
    normalizedPath === "/" ? siteUrl : `${siteUrl}${normalizedPath}`;

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical },
    ...(robots ? { robots } : {}),
  };
}

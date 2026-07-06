import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/trip-history",
  title: "Aleet - Trip History",
  robots: { index: false, follow: false },
});

export default function TripHistoryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

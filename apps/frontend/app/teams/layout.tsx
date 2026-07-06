import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/teams",
  title: "Aleet Teams Portal",
  description:
    "Private access for strategic builders, investors, and leadership partners.",
  robots: {
    index: false,
    follow: false,
  },
});

export default function TeamsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

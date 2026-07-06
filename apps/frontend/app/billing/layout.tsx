import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/billing",
  title: "Aleet - Billing",
  robots: { index: false, follow: false },
});

export default function BillingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

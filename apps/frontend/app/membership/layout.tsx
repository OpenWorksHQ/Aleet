import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/membership",
  title: "ALEET - Membership",
  description:
    "Explore Aleet membership plans with locked-in rates, priority booking, and concierge access.",
});

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

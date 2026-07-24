import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/subscription-success",
  title: "Membership Confirmed",
  robots: { index: false, follow: false },
});

export default function SubscriptionSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

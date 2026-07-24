import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/checkout",
  title: "Checkout",
  robots: { index: false, follow: false },
});

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

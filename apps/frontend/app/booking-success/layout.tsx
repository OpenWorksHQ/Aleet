import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/booking-success",
  title: "Booking Confirmed",
  robots: { index: false, follow: false },
});

export default function BookingSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

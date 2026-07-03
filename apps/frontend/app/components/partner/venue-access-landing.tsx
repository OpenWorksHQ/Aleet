"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { savePartnerContext } from "@/lib/partner/attribution";
import { savePendingBooking } from "@/lib/pending-booking";
import { buildVenueAccessPendingBooking } from "@/lib/partner/venue-access";
import type { PartnerContext } from "@/lib/partner/types";
import { RedirectShell } from "@/app/components/marketing-page-shell";

type VenueAccessLandingProps = {
  venueSlug: string;
  partner: PartnerContext;
};

export function VenueAccessLanding({ venueSlug, partner }: VenueAccessLandingProps) {
  const router = useRouter();

  useEffect(() => {
    savePartnerContext({ ...partner, trackingSlug: venueSlug });
    savePendingBooking(buildVenueAccessPendingBooking(partner));

    const token = getToken();
    router.replace(token ? "/booking" : "/login?next=/booking");
  }, [venueSlug, partner, router]);

  return (
    <RedirectShell
      eyebrow="Venue Access"
      title={partner.partnerName}
      subtitle={`Setting up your ride from ${partner.partnerName}…`}
    />
  );
}

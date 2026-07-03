"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { savePartnerContext } from "@/lib/partner/attribution";
import { savePendingBooking } from "@/lib/pending-booking";
import { buildVenueAccessPendingBooking } from "@/lib/partner/venue-access";
import type { PartnerContext } from "@/lib/partner/types";
import { PartnerSlugGate } from "@/app/components/partner/partner-slug-gate";
import { RedirectShell } from "@/app/components/marketing-page-shell";

type VenueAccessLandingProps = {
  venueSlug: string;
  partner: PartnerContext;
};

export function VenueAccessLanding({ venueSlug, partner }: VenueAccessLandingProps) {
  const router = useRouter();

  useEffect(() => {
    if (!partner.pickupLocation?.text) {
      return;
    }

    savePartnerContext({ ...partner, trackingSlug: venueSlug });
    savePendingBooking(buildVenueAccessPendingBooking(partner));

    const token = getToken();
    router.replace(token ? "/booking" : "/login?next=/booking");
  }, [venueSlug, partner, router]);

  if (!partner.pickupLocation?.text) {
    return (
      <RedirectShell
        eyebrow="Venue Access"
        title={partner.partnerName}
        subtitle="This venue is missing a pickup location. Please contact support."
      />
    );
  }

  return (
    <RedirectShell
      eyebrow="Venue Access"
      title={partner.partnerName}
      subtitle={`Setting up your ride from ${partner.partnerName}…`}
    />
  );
}

export function VenueAccessLandingBySlug({ venueSlug }: { venueSlug: string }) {
  return (
    <PartnerSlugGate slug={venueSlug} mode="venue">
      {(partner) => <VenueAccessLanding venueSlug={venueSlug} partner={partner} />}
    </PartnerSlugGate>
  );
}

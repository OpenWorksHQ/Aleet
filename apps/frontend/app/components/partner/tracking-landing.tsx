"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { savePartnerContext } from "@/lib/partner/attribution";
import type { PartnerContext } from "@/lib/partner/types";
import { PartnerSlugGate } from "@/app/components/partner/partner-slug-gate";
import { RedirectShell } from "@/app/components/marketing-page-shell";

type TrackingLandingProps = {
  slug: string;
  partner: PartnerContext;
};

function TrackingLanding({ slug, partner }: TrackingLandingProps) {
  const router = useRouter();

  useEffect(() => {
    savePartnerContext({ ...partner, trackingSlug: slug });
    router.replace("/?partner=1");
  }, [slug, partner, router]);

  return (
    <RedirectShell
      eyebrow="Aleet"
      title={partner.partnerName}
      subtitle="Preparing your experience…"
    />
  );
}

export function TrackingLandingBySlug({ slug }: { slug: string }) {
  return (
    <PartnerSlugGate slug={slug} mode="tracking">
      {(partner) => <TrackingLanding slug={slug} partner={partner} />}
    </PartnerSlugGate>
  );
}

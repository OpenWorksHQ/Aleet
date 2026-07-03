"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { savePartnerContext } from "@/lib/partner/attribution";
import { resolveTrackingSlug } from "@/lib/partner/registry";
import type { PartnerContext } from "@/lib/partner/types";
import { RedirectShell } from "@/app/components/marketing-page-shell";

type TrackingLandingProps = {
  slug: string;
  partner: PartnerContext;
};

export function TrackingLanding({ slug, partner }: TrackingLandingProps) {
  const router = useRouter();

  useEffect(() => {
    savePartnerContext({ ...partner, trackingSlug: slug });
    router.replace("/?partner=1");
  }, [slug, partner, router]);

  return (
    <RedirectShell
      eyebrow="Aleet"
      title="Welcome"
      subtitle="Preparing your experience…"
    />
  );
}

export function TrackingLandingBySlug({ slug }: { slug: string }) {
  const partner = resolveTrackingSlug(slug);
  if (!partner) return null;
  return <TrackingLanding slug={slug} partner={partner} />;
}

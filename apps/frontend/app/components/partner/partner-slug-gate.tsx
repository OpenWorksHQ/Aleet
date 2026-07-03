"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resolvePartnerBySlug } from "@/lib/api/partners";
import type { PartnerContext } from "@/lib/partner/types";
import {
  MarketingPageShell,
  RedirectShell,
} from "@/app/components/marketing-page-shell";

type PartnerSlugGateProps = {
  slug: string;
  mode: "tracking" | "venue";
  children: (partner: PartnerContext) => React.ReactNode;
};

export function PartnerSlugGate({ slug, mode, children }: PartnerSlugGateProps) {
  const [partner, setPartner] = useState<PartnerContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await resolvePartnerBySlug(slug);
      if (cancelled) return;

      if (!res.data) {
        setError(res.message || "This partner link is not valid.");
        return;
      }

      const isVenue = res.data.bookingMode === "venue_access";
      if (mode === "tracking" && isVenue) {
        setError("This venue link should be opened from its QR code or access page.");
        return;
      }
      if (mode === "venue" && !isVenue) {
        setError("This link is not a venue access partner.");
        return;
      }

      setPartner(res.data);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, mode]);

  if (error) {
    return (
      <MarketingPageShell showFooter={false}>
        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-5 py-16">
          <div className="max-w-md rounded-3xl border border-aleet-border bg-aleet-card px-8 py-10 text-center shadow-sm">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
              Partner link
            </p>
            <h1 className="mt-4 font-serif text-2xl text-aleet-text">Link not available</h1>
            <p className="mt-3 text-sm leading-relaxed text-aleet-text-muted">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-flex text-[13px] font-semibold text-aleet-gold no-underline hover:underline"
            >
              Return to homepage →
            </Link>
          </div>
        </div>
      </MarketingPageShell>
    );
  }

  if (!partner) {
    return (
      <RedirectShell
        eyebrow={mode === "venue" ? "Venue Access" : "Aleet"}
        title="One moment"
        subtitle="Verifying your partner link…"
      />
    );
  }

  return <>{children(partner)}</>;
}

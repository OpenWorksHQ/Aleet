"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MembershipPlansSection } from "@/app/components/membership-plans-section";
import {
  MarketingPageShell,
  MarketingSection,
} from "@/app/components/marketing-page-shell";
import { getToken } from "@/lib/auth";

export default function MembershipPage() {
  const [ctaHref, setCtaHref] = useState("/login?next=/subscription");

  useEffect(() => {
    setCtaHref(getToken() ? "/subscription" : "/login?next=/subscription");
  }, []);

  return (
    <MarketingPageShell>
      <MarketingSection className="pb-10 pt-12 sm:pb-14 sm:pt-16">
        <div className="max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
            Membership
          </p>
          <h1 className="mt-4 font-serif text-[40px] leading-[1.08] text-aleet-text sm:text-[48px] xl:text-[56px]">
            Premium access,{" "}
            <em
              className="font-serif not-italic text-aleet-gold"
              style={{ fontStyle: "italic" }}
            >
              built around you.
            </em>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-[1.75] text-aleet-text-muted sm:text-[16px]">
            One membership unlocks locked-in $89/hr rates, priority support, and access to
            Aleet&apos;s curated transportation and concierge network.
          </p>
          <p className="mt-3 text-[13px] text-aleet-text-subtle">
            Founder 30 is a private invite-only offer — invited members see it on their
            Subscription page after signing in.
          </p>
        </div>

        <div className="mt-12">
          <MembershipPlansSection ctaHref={ctaHref} ctaLabel="Get membership" />
        </div>

        <div className="mt-12 rounded-2xl border border-aleet-border bg-aleet-card px-6 py-8 text-center sm:px-10">
          <h2 className="font-serif text-2xl text-aleet-text sm:text-3xl">
            Ready to join?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-aleet-text-muted">
            Continue to checkout on your Aleet account so the membership is attached to
            the same profile you use for bookings.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-aleet-gold px-6 text-[14px] font-semibold text-aleet-text no-underline transition-opacity hover:opacity-90"
            >
              Continue to payment
            </Link>
            <Link
              href="/login?next=/subscription"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-aleet-border-strong bg-aleet-cream px-6 text-[14px] font-semibold text-aleet-text no-underline transition-colors hover:border-aleet-gold/40"
            >
              Log in
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}

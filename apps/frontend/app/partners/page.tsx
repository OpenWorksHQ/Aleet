import type { Metadata } from "next";
import Link from "next/link";
import { PartnerApplicationForm } from "@/app/components/partner/partner-application-form";
import { PartnerPortalActions } from "@/app/components/partner/partner-portal-actions";
import {
  MarketingPageShell,
  MarketingSection,
} from "@/app/components/marketing-page-shell";

export const metadata: Metadata = {
  title: "Aleet Partner Portal — Become a Partner",
  description:
    "Apply to become an Aleet partner venue. Earn commissions on bookings made through your QR code and partner page.",
};

export default function PartnersPage() {
  return (
    <MarketingPageShell>
      <MarketingSection>
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
              Partner Portal
            </p>
            <h1 className="mt-4 font-serif text-[40px] leading-[1.08] text-aleet-text sm:text-[48px]">
              Turn guest transportation into{" "}
              <em
                className="font-serif not-italic text-aleet-gold"
                style={{ fontStyle: "italic" }}
              >
                partner revenue.
              </em>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.75] text-aleet-text-muted">
              Venues, hotels, lounges, and event spaces can apply to become
              Aleet partners. Once approved, you receive a unique partner page,
              QR code, and commission on every qualifying booking.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <FeatureCard
                title="Unique QR code"
                text="Guests scan and book with your venue already attached."
              />
              <FeatureCard
                title="Clean booking links"
                text="Share branded URLs like aleet.app/lounge — no ugly referral codes."
              />
              <FeatureCard
                title="Commission tracking"
                text="View bookings, earnings, and payouts in your partner dashboard."
              />
            </div>

            <div className="mt-10 rounded-2xl border border-aleet-border bg-aleet-card p-6">
              <h2 className="font-serif text-xl text-aleet-text">
                How Venue Access works
              </h2>
              <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-aleet-text-muted">
                <li>
                  1. Guest scans your venue QR code or visits your partner page.
                </li>
                <li>
                  2. Pickup is pre-filled with your venue — they enter drop-off
                  only.
                </li>
                <li>
                  3. Route, duration, and price are calculated automatically.
                </li>
                <li>
                  4. Booking is attributed to your venue for reporting and
                  payout.
                </li>
              </ol>
              <div className="mt-5 flex flex-wrap gap-4">
                <PartnerPortalActions />
              </div>
            </div>
          </div>

          <PartnerApplicationForm />
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-aleet-border bg-aleet-card p-5">
      <p className="text-[14px] font-semibold text-aleet-text">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-aleet-text-muted">
        {text}
      </p>
    </div>
  );
}

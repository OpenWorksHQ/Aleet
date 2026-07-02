import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/app/components/app-header";
import { MembershipPlansSection } from "@/app/components/membership-plans-section";
import { SiteFooter } from "@/app/components/site-footer";

export const metadata: Metadata = {
  title: "Aleet - Membership",
  description:
    "Explore Aleet membership plans with locked-in rates, priority booking, and concierge access.",
};

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-aleet-cream text-aleet-text">
      <AppHeader showMarketingNav />

      <section className="relative overflow-hidden px-5 pb-10 pt-12 sm:px-8 sm:pb-14 sm:pt-16 lg:px-12 xl:px-16">
        <div className="pointer-events-none absolute inset-0 bg-size-[28px_28px] opacity-35 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)]" />
        <div className="relative mx-auto w-full max-w-[1440px]">
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
              Choose the membership that fits your lifestyle. Every plan includes
              locked-in hourly rates, priority support, and access to Aleet&apos;s
              curated transportation and concierge network.
            </p>
          </div>

          <div className="mt-12">
            <MembershipPlansSection />
          </div>

          <div className="mt-12 rounded-2xl border border-aleet-border bg-aleet-card px-6 py-8 text-center sm:px-10">
            <h2 className="font-serif text-2xl text-aleet-text sm:text-3xl">
              Ready to join?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-aleet-text-muted">
              Create your account to activate membership, manage bookings, and
              unlock member pricing across every market we serve.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-aleet-gold px-6 text-[14px] font-semibold text-aleet-text no-underline transition-opacity hover:opacity-90"
              >
                Join Aleet
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-aleet-border-strong bg-aleet-cream px-6 text-[14px] font-semibold text-aleet-text no-underline transition-colors hover:border-aleet-gold/40"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

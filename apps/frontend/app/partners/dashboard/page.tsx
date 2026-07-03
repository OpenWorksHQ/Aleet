"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getPartnerDashboard } from "@/lib/api/partners";
import {
  loadPartnerContext,
  PARTNER_CHANGED_EVENT,
} from "@/lib/partner/attribution";
import type { PartnerContext, PartnerDashboardStats } from "@/lib/partner/types";
import {
  MarketingPageShell,
  MarketingSection,
} from "@/app/components/marketing-page-shell";
import { toast } from "@/app/components/ui";

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerContext | null>(null);
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingUrl, setBookingUrl] = useState("");

  useEffect(() => {
    const refreshPartner = () => setPartner(loadPartnerContext());
    refreshPartner();
    window.addEventListener(PARTNER_CHANGED_EVENT, refreshPartner);
    return () => window.removeEventListener(PARTNER_CHANGED_EVENT, refreshPartner);
  }, []);

  useEffect(() => {
    if (!partner?.partnerId) {
      setLoading(false);
      setStats(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getPartnerDashboard(partner.partnerId).then((res) => {
      if (res.data) {
        setStats(res.data);
        const slug = res.data.venueSlug;
        setBookingUrl(
          slug
            ? `${window.location.origin}/access/${slug}`
            : `${window.location.origin}/?partner=1`,
        );
      } else {
        setStats(null);
        setError(res.message || "Could not load dashboard.");
      }
      setLoading(false);
    });
  }, [partner?.partnerId]);

  const copyLink = useCallback(async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  }, [bookingUrl]);

  const qrUrl = bookingUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(bookingUrl)}`
    : "";

  return (
    <MarketingPageShell showMarketingNav={false}>
      <MarketingSection className="py-10 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
              Partner Dashboard
            </p>
            <h1 className="mt-2 font-serif text-3xl text-aleet-text sm:text-4xl">
              {stats?.partnerName ?? partner?.partnerName ?? "Partner Portal"}
            </h1>
            <p className="mt-2 text-sm text-aleet-text-muted">
              Track referrals, bookings, and commission performance.
            </p>
          </div>
          <Link
            href="/partners"
            className="text-[13px] font-semibold text-aleet-gold no-underline hover:underline"
          >
            ← Partner program
          </Link>
        </div>

        {!partner?.partnerId ? (
          <EmptyState
            title="No partner selected"
            text="Visit your venue access link or enter a partner code on the homepage first, then return here."
            actionHref="/partners"
            actionLabel="Partner program"
          />
        ) : loading ? (
          <p className="text-sm text-aleet-text-muted">Loading dashboard…</p>
        ) : error ? (
          <EmptyState title="Dashboard unavailable" text={error} actionHref="/" actionLabel="Go to homepage" />
        ) : stats ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total bookings" value={String(stats.totalBookings)} />
              <StatCard label="Completed" value={String(stats.completedBookings)} />
              <StatCard label="Pending payout" value={`$${stats.pendingPayout.toFixed(2)}`} />
              <StatCard label="Lifetime earnings" value={`$${stats.lifetimeEarnings.toFixed(2)}`} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
              <section className="rounded-2xl border border-aleet-border bg-aleet-card p-6 shadow-sm">
                <h2 className="font-serif text-xl text-aleet-text">Your QR code</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-aleet-text-muted">
                  Place this at your venue so guests book with pickup pre-filled.
                </p>
                {qrUrl ? (
                  <div className="mt-5 flex justify-center rounded-xl border border-aleet-border bg-aleet-cream p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="Partner booking QR code" className="h-[220px] w-[220px]" />
                  </div>
                ) : null}
                <p className="mt-4 break-all text-[12px] text-aleet-text-subtle">{bookingUrl}</p>
                <button
                  type="button"
                  onClick={copyLink}
                  className="mt-3 cursor-pointer text-[12px] font-semibold text-aleet-gold hover:underline"
                >
                  Copy booking link
                </button>
                <p className="mt-3 text-[12px] text-aleet-text-muted">
                  Commission rate: <strong>{stats.commissionPct}%</strong> per qualifying booking
                </p>
              </section>

              <section className="rounded-2xl border border-aleet-border bg-aleet-card p-6 shadow-sm">
                <h2 className="font-serif text-xl text-aleet-text">Recent bookings</h2>
                {stats.recentBookings.length === 0 ? (
                  <p className="mt-4 text-[13px] text-aleet-text-muted">
                    No bookings yet. Share your QR code or link to get started.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {stats.recentBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-aleet-text">{booking.route}</p>
                          <p className="mt-0.5 text-[12px] text-aleet-text-subtle">{booking.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-aleet-text">
                            ${booking.amount.toFixed(0)}
                          </p>
                          <p className="text-[12px] text-aleet-gold">
                            +${booking.commission.toFixed(2)} commission
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : null}
      </MarketingSection>
    </MarketingPageShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-aleet-border bg-aleet-card px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-aleet-gold">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-aleet-border bg-aleet-card px-6 py-10 text-center">
      <h2 className="font-serif text-xl text-aleet-text">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-aleet-text-muted">{text}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex text-[13px] font-semibold text-aleet-gold no-underline hover:underline"
      >
        {actionLabel} →
      </Link>
    </div>
  );
}

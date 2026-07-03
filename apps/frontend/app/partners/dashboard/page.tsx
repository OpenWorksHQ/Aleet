"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import {
  authenticatePartnerDashboard,
  getPartnerDashboard,
} from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import {
  loadPartnerContext,
  loadPartnerDashboardToken,
  PARTNER_CHANGED_EVENT,
  savePartnerContext,
  savePartnerDashboardToken,
} from "@/lib/partner/attribution";
import type { PartnerContext, PartnerDashboardStats } from "@/lib/partner/types";
import {
  MarketingPageShell,
  MarketingSection,
} from "@/app/components/marketing-page-shell";
import { toast } from "@/app/components/ui";

function buildBookingUrl(stats: PartnerDashboardStats): string {
  const base = getSiteUrl();
  if (stats.venueSlug) return `${base}/access/${stats.venueSlug}`;
  if (stats.trackingSlug) return `${base}/${stats.trackingSlug}`;
  return base;
}

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerContext | null>(null);
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingUrl, setBookingUrl] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    const refreshPartner = () => {
      const ctx = loadPartnerContext();
      setPartner(ctx);
      if (ctx?.partnerCode) setAuthCode(ctx.partnerCode);
    };
    refreshPartner();
    window.addEventListener(PARTNER_CHANGED_EVENT, refreshPartner);
    return () => window.removeEventListener(PARTNER_CHANGED_EVENT, refreshPartner);
  }, []);

  const loadDashboard = useCallback(async (partnerId: string) => {
    setLoading(true);
    setError(null);
    setNeedsAuth(false);

    const res = await getPartnerDashboard(partnerId);
    if (res.data) {
      setStats(res.data);
      setBookingUrl(buildBookingUrl(res.data));
      setLoading(false);
      return;
    }

    if (res.message.toLowerCase().includes("access denied") || res.message.toLowerCase().includes("sign in")) {
      setNeedsAuth(true);
      setStats(null);
      setError(null);
    } else {
      setStats(null);
      setError(res.message || "Could not load dashboard.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!partner?.partnerId) {
      setLoading(false);
      setStats(null);
      setError(null);
      setNeedsAuth(!loadPartnerDashboardToken());
      return;
    }

    void loadDashboard(partner.partnerId);
  }, [partner?.partnerId, loadDashboard]);

  async function handlePartnerSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    try {
      const res = await authenticatePartnerDashboard(authCode.trim(), authEmail.trim());
      if (!res.data) throw new Error("Authentication failed");

      savePartnerDashboardToken(res.data.dashboardAccessToken);
      savePartnerContext(res.data.partner);
      setPartner(res.data.partner);
      toast.success("Signed in to partner dashboard.");
      await loadDashboard(res.data.partner.partnerId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not sign in.";
      setError(message);
      toast.error(message);
    } finally {
      setAuthLoading(false);
    }
  }

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

        {needsAuth && !loadPartnerDashboardToken() ? (
          <div className="mx-auto max-w-md rounded-2xl border border-aleet-border bg-aleet-card px-6 py-8 shadow-sm">
            <h2 className="font-serif text-xl text-aleet-text">Partner sign in</h2>
            <p className="mt-2 text-sm text-aleet-text-muted">
              Enter your partner code and the contact email from your application to view your dashboard.
            </p>
            <form onSubmit={handlePartnerSignIn} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-aleet-text-subtle">
                  Partner code
                </span>
                <input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-aleet-border bg-aleet-cream px-3 py-2.5 text-sm text-aleet-text outline-none focus:border-aleet-gold/40"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-aleet-text-subtle">
                  Contact email
                </span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full rounded-xl border border-aleet-border bg-aleet-cream px-3 py-2.5 text-sm text-aleet-text outline-none focus:border-aleet-gold/40"
                  required
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-aleet-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
              >
                {authLoading ? "Signing in…" : "View dashboard"}
              </button>
            </form>
          </div>
        ) : !partner?.partnerId ? (
          <EmptyState
            title="No partner selected"
            text="Visit your partner link first, or sign in with your partner code and contact email."
            actionHref="/partners"
            actionLabel="Partner program"
          />
        ) : loading ? (
          <p className="text-sm text-aleet-text-muted">Loading dashboard…</p>
        ) : error ? (
          <EmptyState title="Dashboard unavailable" text={error} actionHref="/partners" actionLabel="Partner program" />
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
                  Share this link or QR code so bookings are attributed to your partner account.
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

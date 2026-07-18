"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import {
  getPartnerAuthMe,
  getPartnerDashboardMe,
  getPartnerProfileMe,
  isPartnerLoggedIn,
  listPartnerUpdateRequestsMe,
  partnerLogout,
} from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import type {
  PartnerDashboardStats,
  PartnerProfile,
  PartnerUpdateRequest,
} from "@/lib/partner/types";
import {
  MarketingPageShell,
  MarketingSection,
} from "@/app/components/marketing-page-shell";
import { toast } from "@/app/components/ui";
import { PartnerUpdateRequestForm } from "@/app/components/partner/partner-update-request-form";
import { PartnerUpdateRequestsList } from "@/app/components/partner/partner-update-requests-list";
import { PartnerPayoutsPanel } from "@/app/components/partner/partner-payouts-panel";

function buildBookingUrl(stats: PartnerDashboardStats): string {
  const base = getSiteUrl();
  if (stats.venueSlug) return `${base}/access/${stats.venueSlug}`;
  if (stats.trackingSlug) return `${base}/${stats.trackingSlug}`;
  return base;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [requests, setRequests] = useState<PartnerUpdateRequest[]>([]);
  const [partnerName, setPartnerName] = useState("Partner Portal");
  const [bookingUrl, setBookingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!isPartnerLoggedIn()) {
      router.replace("/partners/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [meRes, dashboardRes, profileRes, requestsRes] = await Promise.all([
        getPartnerAuthMe(),
        getPartnerDashboardMe(),
        getPartnerProfileMe(),
        listPartnerUpdateRequestsMe(),
      ]);

      setPartnerName(
        dashboardRes.data?.partnerName
          ?? meRes.data?.partner?.partnerName
          ?? "Partner Portal",
      );
      setStats(dashboardRes.data ?? null);
      setProfile(profileRes.data ?? null);
      setRequests(requestsRes.data ?? []);
      if (dashboardRes.data) setBookingUrl(buildBookingUrl(dashboardRes.data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/partners/login");
        return;
      }
      const message = err instanceof ApiError ? err.message : "Could not load dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const copyLink = useCallback(async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  }, [bookingUrl]);

  function handleLogout() {
    partnerLogout();
    router.push("/partners/login");
  }

  const hasPendingRequest = requests.some((r) => r.status === "pending");
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
            <h1 className="mt-2 font-serif text-3xl text-aleet-text sm:text-4xl">{partnerName}</h1>
            <p className="mt-2 text-sm text-aleet-text-muted">
              Track referrals, bookings, commission, and manage payout details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-aleet-border px-4 py-2 text-[13px] font-medium text-aleet-text-muted hover:text-aleet-text"
            >
              Sign out
            </button>
            <Link
              href="/partners"
              className="text-[13px] font-semibold text-aleet-gold no-underline hover:underline"
            >
              ← Partner program
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-aleet-text-muted">Loading dashboard…</p>
        ) : error ? (
          <EmptyState title="Dashboard unavailable" text={error} />
        ) : stats && profile ? (
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

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <PartnerPayoutsPanel stats={stats} />

              <details className="rounded-2xl border border-aleet-border bg-aleet-card p-6 shadow-sm">
                <summary className="cursor-pointer list-none font-serif text-xl text-aleet-text">
                  Business profile updates
                  <span className="mt-1 block text-[13px] font-sans font-normal text-aleet-text-muted">
                    Optional — request address or contact changes for admin review
                  </span>
                </summary>
                <div className="mt-5 border-t border-aleet-border pt-5">
                  <PartnerUpdateRequestForm
                    profile={profile}
                    hasPendingRequest={hasPendingRequest}
                    onSubmitted={() => void loadAll()}
                  />
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-aleet-text">Request history</h3>
                    <div className="mt-3">
                      <PartnerUpdateRequestsList requests={requests} />
                    </div>
                  </div>
                </div>
              </details>
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-aleet-border bg-aleet-card px-6 py-10 text-center">
      <h2 className="font-serif text-xl text-aleet-text">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-aleet-text-muted">{text}</p>
    </div>
  );
}

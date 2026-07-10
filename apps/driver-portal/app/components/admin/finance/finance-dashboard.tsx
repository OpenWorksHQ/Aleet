"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchRevenueReportClient,
  fetchPayoutBreakdownClient,
  type RevenueReport,
  type PayoutBreakdown,
} from "@/lib/admin-finance-api";

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FinanceDashboard() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLookup, setBookingLookup] = useState("");
  const [breakdown, setBreakdown] = useState<PayoutBreakdown | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRevenueReportClient({ status: "Completed" });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load revenue report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = bookingLookup.trim();
    if (!id) return;
    setLookupBusy(true);
    setLookupError(null);
    setBreakdown(null);
    try {
      const data = await fetchPayoutBreakdownClient(id);
      setBreakdown(data);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading revenue report…
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Completed trips" value={String(report.totalTrips)} />
            <Stat label="Gross revenue" value={money(report.totalRevenue)} />
            <Stat label="Driver payouts" value={money(report.totalDriverPayouts)} />
            <Stat label="Company net" value={money(report.companyNetRevenue)} highlight />
          </div>

          <div className="rounded-2xl border border-border bg-card-bg p-5">
            <h2 className="mb-4 text-sm font-semibold text-text">By driver tier</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Trips</th>
                    <th className="pb-2 pr-4">Revenue</th>
                    <th className="pb-2 pr-4">Driver payouts</th>
                    <th className="pb-2">Company revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.byTier).map(([tier, row]) => (
                    <tr key={tier} className="border-b border-border/50 text-text">
                      <td className="py-2.5 pr-4 font-medium">{tier}</td>
                      <td className="py-2.5 pr-4">{row.trips}</td>
                      <td className="py-2.5 pr-4">{money(row.revenue)}</td>
                      <td className="py-2.5 pr-4">{money(row.driverPayouts)}</td>
                      <td className="py-2.5">{money(row.companyRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-2xl border border-border bg-card-bg p-5">
        <h2 className="mb-2 text-sm font-semibold text-text">Booking payout lookup</h2>
        <p className="mb-4 text-xs text-muted">
          Enter a booking ID to see line-item driver payout math (no mock payout queue — real API only).
        </p>
        <form onSubmit={handleLookup} className="flex flex-wrap gap-3">
          <input
            value={bookingLookup}
            onChange={(e) => setBookingLookup(e.target.value)}
            placeholder="Booking ID (MongoDB _id)"
            className="min-w-[240px] flex-1 rounded-xl border border-border bg-page-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={lookupBusy}
            className="rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-gold/90 disabled:opacity-50"
          >
            {lookupBusy ? "Loading…" : "Look up"}
          </button>
        </form>
        {lookupError && <p className="mt-3 text-sm text-red-400">{lookupError}</p>}
        {breakdown && (
          <dl className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            <Row label="Booking" value={String(breakdown.bookingId)} />
            <Row label="Driver" value={breakdown.driver ? `${breakdown.driver.name} (${breakdown.driver.tier})` : "Unassigned"} />
            <Row label="Final price" value={money(breakdown.finalPrice)} />
            <Row label="Booking fee" value={money(breakdown.bookingFee)} />
            <Row label="Payout rate" value={`${(breakdown.payoutRate * 100).toFixed(0)}%`} />
            <Row label="Driver payout" value={money(breakdown.driverPayout)} />
            <Row label="Company revenue" value={money(breakdown.companyRevenue)} />
            <Row label="Tip (pass-through)" value={money(Number(breakdown.tip) || 0)} />
          </dl>
        )}
      </div>

      <button
        type="button"
        onClick={loadReport}
        className="self-start rounded-xl border border-border px-4 py-2 text-sm text-muted hover:border-gold/40 hover:text-gold"
      >
        Refresh report
      </button>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card-bg p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className={highlight ? "mt-1 text-2xl font-bold text-gold" : "mt-1 text-2xl font-bold text-text"}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg border border-border/50 px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}

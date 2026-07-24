"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "../components/dashboard-shell";
import { cn } from "@/lib/utils";
import { cancelMyBooking, fetchMyBookings, type MyBooking } from "@/lib/api/my-bookings";
import { getToken } from "@/lib/auth";
import { toast } from "@/app/components/ui";

type TripBucket = "upcoming" | "active" | "completed" | "cancelled";

const STATUS_STYLES: Record<TripBucket, string> = {
  active: "bg-aleet-gold text-aleet-text",
  upcoming: "bg-aleet-gold text-aleet-text",
  completed: "bg-aleet-cream text-aleet-text-muted",
  cancelled: "bg-red-100 text-red-600",
};

/** Map API booking status + dates into history buckets. */
export function getTripBucket(booking: MyBooking, now = new Date()): TripBucket {
  const status = String(booking.status || "").toLowerCase();
  const start = new Date(booking.dates?.startDate || 0).getTime();
  const end = new Date(booking.dates?.endDate || 0).getTime();
  const nowMs = now.getTime();

  if (status === "cancelled" || status === "expired") return "cancelled";
  if (status === "completed") return "completed";

  if (
    (status === "confirmed" || status === "in progress" || status === "in_progress") &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= nowMs &&
    nowMs <= end
  ) {
    return "active";
  }

  if (
    (status === "pending" || status === "confirmed") &&
    Number.isFinite(start) &&
    start > nowMs
  ) {
    return "upcoming";
  }

  // Past window that was never completed — treat as cancelled for display
  // (backend auto-cancel cron also moves these to Cancelled).
  if (Number.isFinite(end) && end < nowMs) return "cancelled";

  return "upcoming";
}

function statusLabel(bucket: TripBucket) {
  return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BookingCard({
  booking,
  onCancelled,
}: {
  booking: MyBooking;
  onCancelled: () => void;
}) {
  const bucket = getTripBucket(booking);
  const badgeStyle = STATUS_STYLES[bucket];
  const [cancelling, setCancelling] = useState(false);

  async function cancelTrip() {
    if (!window.confirm(
      "Cancel this trip? Reserved membership hours are restored only when cancellation is within the allowed window.",
    )) return;

    setCancelling(true);
    try {
      const token = getToken() ?? undefined;
      const result = await cancelMyBooking(booking._id, undefined, token);
      const restored = result.data?.membershipHoursRestored ?? 0;
      toast.success(
        restored > 0
          ? `Trip cancelled. ${restored} membership hour${restored === 1 ? "" : "s"} restored.`
          : "Trip cancelled.",
      );
      onCancelled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel trip.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-aleet-border bg-aleet-card shadow-sm">
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-aleet-text">
            {formatDate(booking.dates.startDate)}
          </p>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", badgeStyle)}>
            {statusLabel(bucket)}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-aleet-text-subtle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 2L12 22M5 9l7-7 7 7" /></svg>
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-aleet-text-muted">Pickup</p>
              <p className="text-sm text-aleet-text">{booking.pickupLocation}</p>
            </div>
          </div>
          {booking.stops.length > 0 && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-aleet-text-subtle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-aleet-text-muted">
                  Stops ({booking.stops.length})
                </p>
                <p className="text-sm text-aleet-text">{booking.stops.map((s) => s.location).join(", ")}</p>
              </div>
            </div>
          )}
          {booking.dropoffLocation && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-aleet-text-subtle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 22V2M5 15l7 7 7-7" /></svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-aleet-text-muted">Drop-off</p>
                <p className="text-sm text-aleet-text">{booking.dropoffLocation}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-aleet-border pt-4">
          <div>
            <p className="text-sm font-medium text-aleet-gold">{booking.vehicleType.name}</p>
            <p className="text-xs text-aleet-text-muted">
              {formatDate(booking.dates.startDate)} — {formatDate(booking.dates.endDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-aleet-text">${Number(booking.finalPrice || 0).toFixed(2)}</p>
            {bucket === "upcoming" && (
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void cancelTrip()}
                className="mt-1 text-xs font-medium text-red-400 hover:underline disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Cancel trip"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TripHistoryPage() {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | TripBucket>("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setBookings([]);
        setError("Please sign in to view your trips.");
        return;
      }
      const res = await fetchMyBookings(token);
      setBookings(res.data ?? []);
    } catch {
      setBookings([]);
      setError("Could not load trip history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onFocus() {
      void load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const buckets: Array<"all" | TripBucket> = ["all", "upcoming", "active", "completed", "cancelled"];

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => getTripBucket(b) === filter);

  return (
    <DashboardShell activeNav="history">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-medium text-aleet-text sm:text-3xl">Trip History</h1>
          <p className="mt-1 text-sm text-aleet-text-muted">All your past and upcoming bookings</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-aleet-border bg-aleet-card p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {buckets.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg px-3 py-2 text-[12px] font-semibold capitalize whitespace-nowrap transition-colors duration-150",
                filter === s ? "bg-aleet-cream text-aleet-text" : "text-aleet-text-muted hover:text-aleet-text",
              )}
            >
              {s}
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  filter === s ? "bg-aleet-gold/20 text-aleet-gold" : "bg-aleet-cream text-aleet-text-subtle",
                )}
              >
                {s === "all"
                  ? bookings.length
                  : bookings.filter((b) => getTripBucket(b) === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-aleet-gold/30 border-t-aleet-gold" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-aleet-border bg-aleet-card py-16 text-center shadow-sm">
          <p className="text-sm text-aleet-text-muted">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 text-sm font-semibold text-aleet-gold hover:underline"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-aleet-border bg-aleet-card py-16 text-center shadow-sm">
          <p className="text-sm text-aleet-text-subtle">
            No {filter === "all" ? "" : filter} trips found.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((booking) => (
            <BookingCard key={booking._id} booking={booking} onCancelled={() => void load()} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

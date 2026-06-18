/** Live same-day booking availability for the booking wizard.
 *
 * The backend (src/services/availabilityService.js) turns same-day booking ON
 * for a region only when `AQD - RB - CL >= MCT` and no admin block is set.
 * This hook surfaces that status so the wizard can show a styled notice and
 * block the booking BEFORE the user reaches the final submit.
 */

import { useEffect, useRef, useState } from "react";
import { combineDateAndTime } from "@/lib/booking-constraints";
import { getSameDayStatus, type SameDayStatus } from "@/lib/api/regions";

/** Pickup within this window of "now" counts as same-day (matches backend). */
const SAME_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Re-check same-day availability every 60 s while the wizard is open on a same-day pickup. */
const POLL_INTERVAL_MS = 60 * 1000;

/** True when the chosen pickup falls inside the same-day (24h) window. */
export function isSameDayPickup(
  pickupDate?: Date,
  pickupTime?: string,
): boolean {
  if (!pickupDate) return false;

  // With a time, use the precise 24h window the backend enforces.
  if (pickupTime) {
    const dt = combineDateAndTime(pickupDate, pickupTime);
    if (dt) return dt.getTime() - Date.now() <= SAME_DAY_WINDOW_MS;
  }

  // No time chosen yet — a pickup dated today is always same-day.
  const now = new Date();
  return (
    pickupDate.getFullYear() === now.getFullYear() &&
    pickupDate.getMonth() === now.getMonth() &&
    pickupDate.getDate() === now.getDate()
  );
}

export type SameDayAvailability = {
  /** Live region status, or null when not applicable / still loading. */
  status: SameDayStatus | null;
  /** The availability lookup is in flight. */
  loading: boolean;
  /** The selected pickup falls inside the same-day window. */
  isSameDay: boolean;
  /** Same-day pickup AND the region is currently unavailable. */
  blocked: boolean;
};

/** The intended trip window (ISO-UTC), forwarded to the availability lookup. */
type TripWindow = { startDate?: string; endDate?: string };

/** A resolved lookup, tagged with the exact query (region + window) it answers. */
type Resolved = { key: string; status: SameDayStatus | null };

/**
 * Resolve live same-day availability for the chosen region + pickup.
 *
 * Pass the intended trip `window` so Committed Load is measured against that
 * exact slot — drivers whose existing trips don't overlap the requested window
 * still count as available (matching the backend submit gate).
 *
 * Only calls the API when the pickup is actually same-day; otherwise it stays
 * idle. Fails open — a failed lookup never blocks booking, since the backend
 * re-checks availability on submit.
 */
export function useSameDayAvailability(
  regionId: string | undefined,
  pickupDate: Date | undefined,
  pickupTime: string | undefined,
  window?: TripWindow,
): SameDayAvailability {
  // Result is tagged with its query key so a stale value (different region OR
  // window) is never trusted.
  const [resolved, setResolved] = useState<Resolved | null>(null);

  const isSameDay = isSameDayPickup(pickupDate, pickupTime);
  const applicable = !!regionId && isSameDay;

  const startDate = window?.startDate;
  const endDate = window?.endDate;
  const key = `${regionId ?? ""}|${startDate ?? ""}|${endDate ?? ""}`;

  // Keep a stable ref to the fetch function so the polling interval can call
  // the latest version without being listed as a dependency (avoids restarting
  // the interval every render).
  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!applicable || !regionId) return;

    let cancelled = false;

    // Core fetch — shared by the initial debounced load and the polling interval.
    function doFetch() {
      getSameDayStatus(regionId!, { startDate, endDate })
        .then((res) => {
          if (!cancelled) setResolved({ key, status: res.data ?? null });
        })
        .catch(() => {
          // Fail open — record a null status so we stop showing "loading".
          if (!cancelled) setResolved({ key, status: null });
        });
    }

    fetchRef.current = doFetch;

    // Small debounce on first load — region/date/window can change quickly.
    const debounce = setTimeout(doFetch, 400);

    // Polling — re-check every 60 s so the UI stays accurate while the
    // customer reads the form. Driver availability can change at any time.
    const poll = setInterval(() => fetchRef.current(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      clearInterval(poll);
    };
  }, [applicable, regionId, startDate, endDate, key]);

  // Everything below is derived — a stale `resolved` from another query is
  // simply ignored, so the effect never needs a synchronous state reset.
  const fresh = applicable && resolved?.key === key;
  const status = fresh ? resolved!.status : null;
  const loading = applicable && !fresh;
  const blocked = applicable && !!status && !status.available;

  return { status, loading, isSameDay, blocked };
}

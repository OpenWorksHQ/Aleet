"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import type { SameDayAvailability } from "@/lib/use-same-day-availability";

/**
 * Styled inline notice for same-day booking eligibility.
 *
 * Self-hiding — renders nothing unless the pickup is same-day. While the
 * availability check is in flight it shows a subtle loading row; once resolved
 * it shows an amber warning card only when the region is blocked.
 */
export function SameDayNotice({ sameDay }: { sameDay: SameDayAvailability }) {
  const { loading, isSameDay, blocked, status } = sameDay;

  if (!isSameDay) return null;

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#1e2a2c] bg-[#0c1211] px-4 py-3 text-[12px] text-white/40">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking same-day availability…
      </div>
    );
  }

  if (!blocked || !status) return null;

  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
        <TriangleAlert className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-amber-300">
          Same-day booking unavailable
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-amber-200/70">
          {status.message}
        </p>
        <p className="mt-1.5 text-[12px] text-amber-200/50">
          Pick a pickup time at least 24 hours out to continue.
        </p>
      </div>
    </div>
  );
}

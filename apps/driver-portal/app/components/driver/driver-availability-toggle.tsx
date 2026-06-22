"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  fetchMyAvailability,
  updateMyAvailability,
  type AvailabilityStatus,
} from "@/lib/availability-api";
import { useUserStore } from "@/lib/user-store";

type UiStatus = "off" | "available";

const OPTIONS: { value: UiStatus; label: string }[] = [
  { value: "off", label: "Unavailable" },
  { value: "available", label: "Available" },
];

function toUiStatus(status: AvailabilityStatus): UiStatus {
  return status === "off" ? "off" : "available";
}

function statusHint(uiStatus: UiStatus, tier: string): string {
  if (uiStatus === "off") {
    return "You are unavailable and will not receive new trip offers.";
  }
  if (tier === "S-Level") {
    return "You are available for S-Level trips (company vehicle).";
  }
  if (tier === "Pro" || tier === "Diamond") {
    return "You are available for trips and count toward same-day regional coverage.";
  }
  return "You are available for trips in your tier.";
}

/** Module-level sync for heartbeat hook. */
let activeAvailability: AvailabilityStatus = "off";
export function getActiveAvailabilityStatus(): AvailabilityStatus {
  return activeAvailability;
}
export function setActiveAvailabilityStatus(status: AvailabilityStatus) {
  activeAvailability = status;
}

function useDriverAvailability() {
  const driverStatus = useUserStore((s) => s.profile?.driverStatus ?? "");
  const tier = useUserStore((s) => s.profile?.tier ?? "");
  const setStoreStatus = useUserStore((s) => s.setAvailabilityStatus);
  const [status, setStatus] = useState<UiStatus>("off");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canToggle = driverStatus === "approved";

  const applyStatus = useCallback(
    (next: AvailabilityStatus) => {
      const ui = toUiStatus(next);
      setStatus(ui);
      setActiveAvailabilityStatus(next === "off" ? "off" : "available");
      setStoreStatus(next === "off" ? "off" : "available");
    },
    [setStoreStatus],
  );

  const load = useCallback(async () => {
    if (!canToggle) {
      setLoading(false);
      applyStatus("off");
      return;
    }
    const data = await fetchMyAvailability();
    applyStatus(data?.status ?? "off");
    setLoading(false);
  }, [canToggle, applyStatus]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function onSelect(next: UiStatus) {
    if (!canToggle || saving || next === status) return;
    setSaving(true);
    const data = await updateMyAvailability(next);
    if (data?.status) applyStatus(data.status);
    setSaving(false);
  }

  return { canToggle, status, tier, loading, saving, onSelect };
}

function SegmentButton({
  opt,
  active,
  disabled,
  onSelect,
}: {
  opt: (typeof OPTIONS)[number];
  active: boolean;
  disabled: boolean;
  onSelect: (v: UiStatus) => void;
}) {
  const isOff = opt.value === "off";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      aria-label={`Set status to ${opt.label}`}
      onClick={() => onSelect(opt.value)}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg font-medium transition-all",
        "min-h-[48px] touch-manipulation select-none sm:min-h-[44px] sm:flex-row sm:gap-1.5",
        "px-3 py-2.5 text-sm sm:px-4 sm:py-3",
        active
          ? isOff
            ? "bg-muted/25 text-muted shadow-sm ring-1 ring-border"
            : "bg-emerald-500/20 text-emerald-400 shadow-sm ring-1 ring-emerald-500/40"
          : "text-muted active:bg-border/40 hover:bg-border/30 hover:text-text",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          active
            ? isOff
              ? "bg-muted"
              : "bg-emerald-400 animate-pulse"
            : "bg-transparent",
        )}
        aria-hidden
      />
      <span className="truncate leading-tight">{opt.label}</span>
    </button>
  );
}

/**
 * Availability control for all approved drivers (S-Level, Pro, Diamond).
 */
export function DriverAvailabilityBar() {
  const { canToggle, status, tier, loading, saving, onSelect } =
    useDriverAvailability();

  if (!canToggle) return null;

  return (
    <div className="sticky top-0 z-40 shrink-0 border-b border-border bg-card-bg/95 backdrop-blur-sm px-3 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs">
              Availability
              {tier ? (
                <span className="ml-1.5 font-normal normal-case text-muted/70">
                  · {tier}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted/80 sm:text-xs">
              {loading ? "Loading…" : statusHint(status, tier)}
            </p>
          </div>
          {status === "available" && !loading && (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              Live
            </span>
          )}
        </div>

        <div
          className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-page-bg/80 p-1.5 sm:p-2"
          role="group"
          aria-label="Driver availability"
        >
          {OPTIONS.map((opt) => (
            <SegmentButton
              key={opt.value}
              opt={opt}
              active={status === opt.value}
              disabled={loading || saving}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

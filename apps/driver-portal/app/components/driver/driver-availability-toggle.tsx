"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  fetchMyAvailability,
  updateMyAvailability,
  type AvailabilityStatus,
} from "@/lib/availability-api";
import { useUserStore } from "@/lib/user-store";

const OPTIONS: { value: AvailabilityStatus; label: string; hint: string }[] = [
  { value: "off", label: "Off", hint: "Not counted in coverage" },
  { value: "available", label: "Available", hint: "Ready for same-day trips" },
  { value: "on_call", label: "On-Call", hint: "Standby — counts toward coverage" },
];

export function DriverAvailabilityToggle() {
  const driverStatus = useUserStore((s) => s.profile?.driverStatus ?? "");
  const tier = useUserStore((s) => s.profile?.tier ?? "");
  const [status, setStatus] = useState<AvailabilityStatus>("off");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canToggle =
    driverStatus === "approved" && (tier === "Pro" || tier === "Diamond");

  const load = useCallback(async () => {
    if (!canToggle) {
      setLoading(false);
      return;
    }
    const data = await fetchMyAvailability();
    if (data?.status) setStatus(data.status);
    setLoading(false);
  }, [canToggle]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSelect(next: AvailabilityStatus) {
    if (!canToggle || saving || next === status) return;
    setSaving(true);
    const data = await updateMyAvailability(next);
    if (data?.status) {
      setStatus(data.status);
      setActiveAvailabilityStatus(data.status);
    }
    setSaving(false);
  }

  if (!canToggle) return null;

  return (
    <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border bg-card-bg/50 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={loading || saving}
          title={opt.hint}
          onClick={() => onSelect(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            status === opt.value
              ? opt.value === "off"
                ? "bg-muted/20 text-muted"
                : "bg-emerald-500/15 text-emerald-400"
              : "text-muted hover:text-text hover:bg-border/30",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Export current status for heartbeat hook (module-level sync). */
let activeAvailability: AvailabilityStatus = "off";
export function getActiveAvailabilityStatus(): AvailabilityStatus {
  return activeAvailability;
}
export function setActiveAvailabilityStatus(status: AvailabilityStatus) {
  activeAvailability = status;
}

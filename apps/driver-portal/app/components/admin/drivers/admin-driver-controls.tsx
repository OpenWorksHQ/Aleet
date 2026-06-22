"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateDriverAdmin, type ApiDriver } from "@/lib/drivers-api";
import type { Driver, DriverStatus, DriverAvailability } from "./driver-types";
import { OnlineBadge, StatusBadge, TierBadge } from "./driver-badges";

const TIERS = ["S-Level", "Pro", "Diamond"] as const;

const ACCOUNT_STATUSES: { value: DriverStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "background_pending", label: "Background pending" },
  { value: "background_completed", label: "Background completed" },
  { value: "needs_revision", label: "Needs revision" },
  { value: "revision_complete", label: "Revision complete" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const AVAILABILITY_OPTIONS = [
  { value: "off", label: "Unavailable" },
  { value: "available", label: "Available" },
] as const;

type AvailabilityValue = (typeof AVAILABILITY_OPTIONS)[number]["value"];

function normalizeAvailability(status: string): AvailabilityValue {
  return status === "available" || status === "on_call" ? "available" : "off";
}

function patchFromApi(d: ApiDriver): Partial<Driver> {
  return {
    status: d.driver.status as DriverStatus,
    tier: d.driver.tier,
    availabilityStatus: (d.driver.availabilityStatus ?? "off") as DriverAvailability,
    isOnline: !!d.driver.isOnline,
    lastSeenAt: d.driver.lastHeartbeatAt ?? d.driver.lastSeenAt ?? null,
    revisionNotes: d.driver.revisionNotes ?? null,
  };
}

type Props = {
  driver: Driver;
  onUpdate: (id: string, patch: Partial<Driver>) => void;
};

function SelectField({
  label,
  hint,
  value,
  disabled,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {hint ? (
        <span className="mb-1.5 block text-[11px] leading-snug text-muted/75">{hint}</span>
      ) : null}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text",
          "focus:border-gold/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {children}
      </select>
    </label>
  );
}

export function AdminDriverControls({ driver, onUpdate }: Props) {
  const [tier, setTier] = useState(driver.tier || "S-Level");
  const [accountStatus, setAccountStatus] = useState<DriverStatus>(driver.status);
  const [availability, setAvailability] = useState<AvailabilityValue>(
    normalizeAvailability(driver.availabilityStatus ?? "off"),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTier(driver.tier || "S-Level");
    setAccountStatus(driver.status);
    setAvailability(normalizeAvailability(driver.availabilityStatus ?? "off"));
  }, [driver.id, driver.tier, driver.status, driver.availabilityStatus]);

  const availabilityDisabled = accountStatus !== "approved";

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateDriverAdmin({
        driverId: driver.id,
        tier: TIERS.includes(tier as (typeof TIERS)[number]) ? tier : undefined,
        driverStatus: accountStatus,
        availabilityStatus: availabilityDisabled ? "off" : availability,
      });
      onUpdate(driver.id, patchFromApi(updated));
      toast.success("Driver tier and status updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update driver");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gold/25 bg-gold/5 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">Tier & status</p>
          <p className="mt-0.5 text-xs text-muted">
            Manually set tier, account status, and trip availability. Tier controls
            which trips the driver qualifies for.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={driver.status} />
          <TierBadge tier={driver.tier} />
          <OnlineBadge isOnline={driver.isOnline} lastSeenAt={driver.lastSeenAt} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Tier"
          hint="S-Level = company vehicle · Pro = own vehicle · Diamond = own vehicle + for-hire license"
          value={tier}
          disabled={saving}
          onChange={setTier}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Account status"
          hint="Onboarding / approval state"
          value={accountStatus}
          disabled={saving}
          onChange={(v) => {
            const next = v as DriverStatus;
            setAccountStatus(next);
            if (next !== "approved") setAvailability("off");
          }}
        >
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Trip availability"
          hint={
            availabilityDisabled
              ? "Driver must be approved to go available"
              : "Pro/Diamond available drivers count toward same-day coverage (AQD)"
          }
          value={availability}
          disabled={saving || availabilityDisabled}
          onChange={(v) => setAvailability(v as AvailabilityValue)}
        >
          {AVAILABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-5 text-sm font-semibold text-gold transition-colors hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving…
            </>
          ) : (
            "Save tier & status"
          )}
        </button>
      </div>
    </div>
  );
}

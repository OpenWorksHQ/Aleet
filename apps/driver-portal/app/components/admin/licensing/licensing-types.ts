import type {
  ApiLicenseStatus,
  ApiBackgroundStatus,
  ApiDriverTier,
} from "@/lib/admin-api";

export type {
  ApiLicenseStatus as LicenseStatus,
  ApiBackgroundStatus as BackgroundStatus,
  ApiDriverTier as DriverTier,
};

export const LICENSE_STATUS_LABELS: Record<ApiLicenseStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  Expired: "Expired",
};

export const LICENSE_STATUS_COLORS: Record<ApiLicenseStatus, string> = {
  Pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  Approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  Rejected: "border-red-500/40 bg-red-500/10 text-red-400",
  Expired: "border-border bg-border/20 text-muted",
};

export const BG_STATUS_LABELS: Record<ApiBackgroundStatus, string> = {
  Pending: "Pending",
  Verified: "Verified",
  Failed: "Failed",
};

export const BG_STATUS_COLORS: Record<ApiBackgroundStatus, string> = {
  Pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  Verified: "border-gold/40 bg-gold/10 text-gold",
  Failed: "border-red-500/40 bg-red-500/10 text-red-400",
};

export const TIER_COLORS: Record<ApiDriverTier, string> = {
  "S-Level": "text-sky-300",
  Pro: "text-gold",
  Diamond: "text-violet-400",
};

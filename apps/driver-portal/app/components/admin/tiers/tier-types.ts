import type { ApiDriverTier } from "@/lib/admin-api";

export type DriverTierLevel = ApiDriverTier;

export const TIER_LABELS: Record<DriverTierLevel, string> = {
  "S-Level": "S-Level",
  Pro: "Pro",
  Diamond: "Diamond",
};

export const TIER_COLORS: Record<DriverTierLevel, string> = {
  "S-Level": "border-sky-400/40 bg-sky-400/10 text-sky-300",
  Pro: "border-gold/40 bg-gold/10 text-gold",
  Diamond: "border-violet-400/40 bg-violet-400/10 text-violet-400",
};

export const TIER_ICON_COLORS: Record<DriverTierLevel, string> = {
  "S-Level": "text-sky-300",
  Pro: "text-gold",
  Diamond: "text-violet-400",
};

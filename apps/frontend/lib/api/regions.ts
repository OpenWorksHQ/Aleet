import { apiFetch } from "@/lib/api";

export type Region = {
  _id: string;
  name: string;
  code: string;
};

export function getRegions() {
  return apiFetch<Region[]>("/regions", { method: "GET" });
}

/** Reason a region's same-day booking is unavailable (null when available). */
export type SameDayReason =
  | "region_inactive"
  | "manual_block"
  | "insufficient_coverage"
  | null;

/**
 * Live same-day availability for a region.
 * Mirrors the backend `computeSameDayStatus` payload
 * (src/services/availabilityService.js).
 */
export type SameDayStatus = {
  regionId?: string;
  aqd: number; // Active Qualified Drivers
  rb: number; // Reserved Buffer
  cl: number; // Committed Load
  mct: number; // Minimum Coverage Threshold
  formulaPass: boolean;
  manualBlock: boolean;
  available: boolean;
  reason: SameDayReason;
  message: string;
};

/**
 * Live same-day availability for a region.
 *
 * Pass the intended trip `window` (ISO-UTC pickup/dropoff) so the backend
 * measures Committed Load against that exact window — drivers whose existing
 * trips don't overlap the requested slot then count as available. Omit it to
 * fall back to the rolling next-24h window.
 */
export function getSameDayStatus(
  regionId: string,
  window?: { startDate?: string; endDate?: string },
) {
  const qs = new URLSearchParams();
  if (window?.startDate) qs.set("startDate", window.startDate);
  if (window?.endDate) qs.set("endDate", window.endDate);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<SameDayStatus>(
    `/regions/${regionId}/same-day-status${suffix}`,
    { method: "GET" },
  );
}

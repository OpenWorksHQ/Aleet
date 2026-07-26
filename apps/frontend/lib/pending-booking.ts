import type { BookingData } from "@/app/components/booking/booking-types";

const KEY = "pendingBooking";
const TTL_MS = 30 * 60 * 1000;

export type PendingBooking = {
  /** Calendar date `YYYY-MM-DD` (preferred) or legacy ISO datetime. */
  pickupDate: string | null;
  /** Calendar date `YYYY-MM-DD` (preferred) or legacy ISO datetime. */
  dropoffDate: string | null;
  pickupTime: string;
  dropoffTime: string;
  vehicleType: string;
  vehicleTypeId: string;
  vehicleHourlyRate: number;
  region: string;
  regionId: string;
  bookingMode?: "buy_hours" | "multi_day" | "venue_access" | "buy-hours" | "multi-day";
  pickupLocationText?: string;
  pickupLocationPlaceId?: string;
  dropoffLocationText?: string;
  dropoffLocationPlaceId?: string;
  promoCode?: string;
  partnerId?: string;
  partnerCode?: string;
  partnerName?: string;
  venueId?: string;
  pickupLocked?: boolean;
  dropoffLocked?: boolean;
  venueAccessBookingType?: string;
  allowedVehicleTypeIds?: string[];
  discountPct?: number;
  estimatedDurationHours?: number;
  routeDistanceMiles?: number;
  routeDurationText?: string;
  _savedAt: number;
};

/**
 * Persist the picker's civil calendar day (not a UTC instant).
 * Using `Date#toISOString()` caused reloads in other timezones to shift the day.
 */
export function toCalendarDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse `YYYY-MM-DD` or legacy ISO into a local midnight Date for the calendar day. */
export function fromCalendarDateString(
  value: string | null | undefined,
): Date | undefined {
  if (!value) return undefined;
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return undefined;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export function savePendingBooking(
  data: Omit<PendingBooking, "_savedAt">,
): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...data, _savedAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

/** Keep browser draft in sync when the user edits times on `/booking`. */
export function savePendingBookingFromData(data: BookingData): void {
  if (!data.pickupDate || !data.pickupTime) return;

  savePendingBooking({
    pickupDate: toCalendarDateString(data.pickupDate),
    dropoffDate: data.dropoffDate
      ? toCalendarDateString(data.dropoffDate)
      : null,
    pickupTime: data.pickupTime,
    dropoffTime: data.dropoffTime,
    vehicleType: data.vehicleType,
    vehicleTypeId: data.vehicleTypeId,
    vehicleHourlyRate: data.vehicleHourlyRate,
    region: data.region,
    regionId: data.regionId,
    bookingMode: data.bookingMode,
    pickupLocationText: data.pickupAddress.text || undefined,
    pickupLocationPlaceId: data.pickupAddress.placeId || undefined,
    dropoffLocationText: data.dropoffAddress.text || undefined,
    dropoffLocationPlaceId: data.dropoffAddress.placeId || undefined,
    promoCode: data.partnerCode,
    partnerId: data.partnerId,
    partnerCode: data.partnerCode,
    partnerName: data.partnerName,
    venueId: data.venueId,
    pickupLocked: data.pickupLocked,
    dropoffLocked: data.dropoffLocked,
    venueAccessBookingType: data.venueAccessBookingType,
    allowedVehicleTypeIds: data.allowedVehicleTypeIds,
    discountPct: data.discountPct,
    estimatedDurationHours: data.estimatedDurationHours,
    routeDistanceMiles: data.routeDistanceMiles,
    routeDurationText: data.routeDurationText,
  });
}

export function loadPendingBooking(): Omit<PendingBooking, "_savedAt"> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: PendingBooking = JSON.parse(raw);
    if (Date.now() - parsed._savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    const { _savedAt, ...rest } = parsed;
    return rest;
  } catch {
    return null;
  }
}

export function clearPendingBooking(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

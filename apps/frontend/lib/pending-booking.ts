const KEY = "pendingBooking";
const TTL_MS = 30 * 60 * 1000;

export type PendingBooking = {
  pickupDate: string | null;
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
  _savedAt: number;
};

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

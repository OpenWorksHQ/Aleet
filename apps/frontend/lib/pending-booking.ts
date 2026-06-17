const KEY = "pendingBooking";
const TTL_MS = 30 * 60 * 1000; // 30 хвилин

export type PendingBooking = {
  pickupDate: string | null; // ISO string
  dropoffDate: string | null; // ISO string
  pickupTime: string;
  dropoffTime: string;
  vehicleType: string;
  vehicleTypeId: string;
  vehicleHourlyRate: number;
  region: string;
  regionId: string;
  bookingMode?: "buy_hours" | "multi_day" | "buy-hours" | "multi-day";
  dropoffLocationText?: string;
  dropoffLocationPlaceId?: string;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

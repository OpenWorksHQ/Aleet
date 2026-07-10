import { apiFetch } from "@/lib/api";
import type { BookingData } from "@/app/components/booking/booking-types";
import moment from "moment";

// ─── Response types ────────────────────────────────────────────────────────

export type BookingPreviewAddon = {
  _id: string;
  name: string;
  type: string;
  price: number;
};

export type BookingPreviewDistance = {
  baseToPickupMiles: number;
  freeMiles: number;
  surchargePerMile: number;
  distanceSurcharge: number;
};

export type BookingPreviewBreakdown = {
  baseRate: number;
  hours: number;
  qty: number;
  addOns?: BookingPreviewAddon[];
  freeHoursUsed: number;
  freeHoursLeft: number;
  distance: BookingPreviewDistance;
  bookingFee?: number;
  memberRate?: number;
  billedHours?: number;
  minimumHoursApplied?: boolean;
  minimumHoursNote?: string | null;
  isLateNight?: boolean;
  lateNightHours?: number;
  lateNightNote?: string | null;
  regularMemberHours?: number;
  subscriptionPrice?: number;
  memberRateApplied?: boolean;
};

export type BookingPriceResult = {
  vehicleType: { _id: string; name: string; hourlyPrice: number };
  quantity: number;
  startDate: string;
  endDate: string;
  hours: number;
  regularPrice: number;
  subscriptionPrice?: number | null;
  total: number;
  breakdown: BookingPreviewBreakdown;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildDateTime(date: Date, timeStr: string): string {
  // Try strict parse first with all common formats
  // "10:00 AM", "08:15 AM", "10:30 am", "10:30AM", "14:00", "14:00:00"
  let parsed = moment(
    timeStr.trim(),
    [
      "h:mm A",
      "hh:mm A",
      "h:mm a",
      "hh:mm a",
      "h:mmA",
      "hh:mmA",
      "H:mm",
      "HH:mm",
      "H:mm:ss",
      "HH:mm:ss",
    ],
    true, // strict
  );

  // If strict fails (e.g. ambiguous format), fall back to non-strict
  if (!parsed.isValid()) {
    parsed = moment(
      timeStr.trim(),
      ["h:mm A", "hh:mm A", "H:mm", "HH:mm"],
      false,
    );
  }

  if (!parsed.isValid()) {
    console.warn("[bookings] Could not parse time:", JSON.stringify(timeStr));
  }

  const h = parsed.isValid() ? parsed.hours() : 0;
  const min = parsed.isValid() ? parsed.minutes() : 0;

  // Combine the picked date + time in the BROWSER'S LOCAL TZ, then convert
  // to UTC via toISOString(). Standard pattern: user picks wall-clock time
  // in their TZ → stored as the correct UTC instant → each viewer renders
  // it in their own local TZ via toLocaleString().
  //
  // The previous moment.utc({...}) construction treated the typed numbers
  // as already-UTC, which dropped the user's TZ offset entirely — caused
  // "Start date must be in future" errors for users west of UTC and
  // silent time drift for everyone not in UTC.
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h,
    min,
    0,
    0,
  ).toISOString();
}

function serializeBookingData(data: BookingData) {
  // Fall back to pickupTime if dropoffTime was never confirmed in the picker
  const effectiveDropoffTime =
    data.dropoffTime || data.pickupTime || "10:00 AM";

  console.log("[bookings] serialize times:", {
    pickupTime: data.pickupTime,
    dropoffTime: data.dropoffTime,
    effectiveDropoffTime,
  });

  const startDate =
    data.pickupDate && data.pickupTime
      ? buildDateTime(data.pickupDate, data.pickupTime)
      : undefined;
  const endDate = data.dropoffDate
    ? buildDateTime(data.dropoffDate, effectiveDropoffTime)
    : undefined;
  const bookingMode = data.bookingMode ?? "multi_day";

  let durationHours: number | undefined;
  if (
    (bookingMode === "buy_hours" || bookingMode === "venue_access") &&
    data.pickupDate &&
    data.pickupTime &&
    data.dropoffDate
  ) {
    const start = moment(buildDateTime(data.pickupDate, data.pickupTime));
    const end = moment(buildDateTime(data.dropoffDate, effectiveDropoffTime));
    const diff = end.diff(start, "minutes") / 60;
    if (diff > 0) durationHours = Number(diff.toFixed(2));
  }

  if (bookingMode === "venue_access" && data.estimatedDurationHours) {
    durationHours = data.estimatedDurationHours;
  }

  const basePayload = {
    bookingMode: bookingMode === "venue_access" ? "buy_hours" : bookingMode,
    region: data.regionId || data.region,
    startDate,
    vehicleTypeId: data.vehicleTypeId,
    quantity: data.quantity,
    pickupLocation: data.pickupAddress.text || data.pickupAddress.placeId,
    dropoffLocation: data.dropoffAddress.text || data.dropoffAddress.placeId,
    addOns: data.selectedAddons,
    specialNotes: data.specialRequests.trim() || undefined,
    partnerId: data.partnerId,
    partnerCode: data.partnerCode,
    venueId: data.venueId,
    promoCode: data.partnerCode,
  };

  // A stop's time is collected as "HH:MM AM/PM" and assumed to be on the
  // pickup date. The backend expects an ISO-UTC datetime, so combine the two.
  const mapStop = (s: BookingData["stops"][number]) => ({
    location: s.address.text,
    ...(s.time && data.pickupDate
      ? { time: buildDateTime(data.pickupDate, s.time) }
      : {}),
    ...(s.notes.trim() ? { notes: s.notes.trim() } : {}),
  });

  if (bookingMode === "buy_hours" || bookingMode === "venue_access") {
    return {
      ...basePayload,
      durationHours,
      state: data.region,
      stops: data.stops.filter((s) => s.address.text).map(mapStop),
    };
  }

  return {
    ...basePayload,
    endDate,
    freeRouting: data.freeRouting,
    stops: data.stops.filter((s) => s.address.text).map(mapStop),
  };
}

/**
 * The intended trip window as ISO-UTC strings, built with the SAME basis
 * (`buildDateTime`) used when persisting a booking — so an overlap check
 * against stored trips compares like-for-like. Used by the same-day
 * availability lookup. Either field is undefined until its date+time exist.
 */
export function buildTripWindow(data: BookingData): {
  startDate?: string;
  endDate?: string;
} {
  const effectiveDropoffTime =
    data.dropoffTime || data.pickupTime || "10:00 AM";
  return {
    startDate:
      data.pickupDate && data.pickupTime
        ? buildDateTime(data.pickupDate, data.pickupTime)
        : undefined,
    endDate: data.dropoffDate
      ? buildDateTime(data.dropoffDate, effectiveDropoffTime)
      : undefined,
  };
}

// ─── Response types for booking creation ──────────────────────────────────

export type BookingResult = {
  booking: {
    _id: string;
    status: string;
    region: string;
    pickupLocation: string;
    dropoffLocation: string;
    dates: { startDate: string; endDate: string };
    vehicleType: string;
    quantity: number;
    addOns: string[];
    stops: unknown[];
    finalPrice: number;
    regularPrice: number;
    paymentStatus: string;
    createdAt: string;
  };
  breakdown: Record<string, unknown>;
};

// ─── API calls ──────────────────────────────────────────────────────────────

export function calculateBookingPrice(data: BookingData, token?: string) {
  return apiFetch<BookingPriceResult>("/bookings/preview", {
    method: "POST",
    body: serializeBookingData(data),
    token,
  });
}

export function startBooking(data: BookingData, token?: string) {
  return apiFetch<BookingResult>("/bookings/start", {
    method: "POST",
    body: serializeBookingData(data),
    token,
  });
}

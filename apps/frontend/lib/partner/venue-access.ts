import type { BookingData } from "@/app/components/booking/booking-types";
import {
  isPickupTimeDisabled,
  slotFromTimeStr,
  today,
} from "@/lib/booking-constraints";
import type { PendingBooking } from "@/lib/pending-booking";
import type { PartnerContext } from "./types";
import { applyRouteDurationToBookingTimes } from "./route-estimate";

function findNearestValidPickupTime(
  date: Date,
  isMember = false,
  skipNotice = false,
): string {
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];
  for (const period of ["AM", "PM"] as const) {
    for (const hour of hours) {
      for (const minute of minutes) {
        const time = `${hour}:${minute} ${period}`;
        if (!isPickupTimeDisabled(date, slotFromTimeStr(time), isMember, { skipNotice })) {
          return time;
        }
      }
    }
  }
  return "12:00 PM";
}

export function buildVenueAccessPendingBooking(
  partner: PartnerContext,
  overrides?: Partial<PendingBooking>,
): Omit<PendingBooking, "_savedAt"> {
  const pickupDate = today();
  // Partner venue: waive 3h notice — earliest open slot from now.
  const pickupTime = findNearestValidPickupTime(pickupDate, false, true);

  return {
    pickupDate: pickupDate.toISOString(),
    dropoffDate: pickupDate.toISOString(),
    pickupTime,
    dropoffTime: pickupTime,
    vehicleType: partner.vehicleName ?? "Luxury Sedan",
    vehicleTypeId: partner.vehicleTypeId ?? "",
    vehicleHourlyRate: partner.vehicleHourlyRate ?? 0,
    region: partner.regionName ?? "",
    regionId: partner.regionId ?? "",
    bookingMode: "venue_access",
    pickupLocationText: partner.pickupLocation?.text ?? "",
    pickupLocationPlaceId: partner.pickupLocation?.placeId ?? "",
    dropoffLocationText: partner.dropoffLocation?.text ?? "",
    dropoffLocationPlaceId: partner.dropoffLocation?.placeId ?? "",
    partnerId: partner.partnerId,
    partnerCode: partner.partnerCode,
    partnerName: partner.partnerName,
    venueId: partner.venueId,
    pickupLocked: partner.pickupLocked ?? true,
    dropoffLocked: partner.dropoffLocked,
    venueAccessBookingType: partner.venueAccessBookingType,
    discountPct: partner.discountPct,
    promoCode: partner.partnerCode,
    ...overrides,
  };
}

export function applyPartnerToBookingData(
  data: BookingData,
  partner: PartnerContext,
): BookingData {
  return {
    ...data,
    bookingMode: partner.bookingMode === "venue_access" ? "venue_access" : data.bookingMode,
    partnerId: partner.partnerId,
    partnerCode: partner.partnerCode,
    partnerName: partner.partnerName,
    venueId: partner.venueId,
    pickupLocked: partner.pickupLocked,
    dropoffLocked: partner.dropoffLocked === true,
    venueAccessBookingType: partner.venueAccessBookingType,
    allowedVehicleTypeIds: partner.allowedVehicleTypeIds,
    discountPct: partner.discountPct,
    pickupAddress: partner.pickupLocation ?? data.pickupAddress,
    dropoffAddress: partner.dropoffLocation?.text
      ? partner.dropoffLocation
      : data.dropoffAddress,
    region: partner.regionName ?? data.region,
    regionId: partner.regionId ?? data.regionId,
    vehicleType: partner.vehicleName ?? data.vehicleType,
    vehicleTypeId: partner.vehicleTypeId ?? data.vehicleTypeId,
    vehicleHourlyRate: partner.vehicleHourlyRate ?? data.vehicleHourlyRate,
    freeRouting: false,
  };
}

export function applyRouteEstimateToBooking(
  data: BookingData,
  durationHours: number,
): Partial<BookingData> {
  if (!data.pickupDate || !data.pickupTime) return {};
  const { dropoffDate, dropoffTime } = applyRouteDurationToBookingTimes(
    data.pickupDate,
    data.pickupTime,
    durationHours,
  );
  return {
    dropoffDate,
    dropoffTime,
    estimatedDurationHours: durationHours,
  };
}

/** Restrict vehicle list when partner specifies allowed types. */
export function filterVehiclesByPartner<T extends { _id: string }>(
  vehicles: T[],
  allowedIds?: string[],
): T[] {
  if (!allowedIds?.length) return vehicles;
  const allowed = new Set(allowedIds);
  return vehicles.filter((v) => allowed.has(v._id));
}

import type { BookingData } from "@/app/components/booking/booking-types";
import {
  isPickupTimeDisabled,
  slotFromTimeStr,
  today,
} from "@/lib/booking-constraints";
import type { PendingBooking } from "@/lib/pending-booking";
import type { PartnerContext } from "./types";
import { applyRouteDurationToBookingTimes } from "./route-estimate";

function findNearestValidPickupTime(date: Date, isMember = false): string {
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];
  for (const period of ["AM", "PM"] as const) {
    for (const hour of hours) {
      for (const minute of minutes) {
        const time = `${hour}:${minute} ${period}`;
        if (!isPickupTimeDisabled(date, slotFromTimeStr(time), isMember)) {
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
  const pickupTime = findNearestValidPickupTime(pickupDate, false);

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
    discountPct: partner.discountPct,
    pickupAddress: partner.pickupLocation ?? data.pickupAddress,
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

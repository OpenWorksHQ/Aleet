import type { PlaceValue } from "@/app/components/booking/booking-types";
import type { RouteEstimate } from "./types";

const MIN_BILLABLE_HOURS = 1;

function roundDurationHours(minutes: number): number {
  const hours = minutes / 60;
  return Math.max(MIN_BILLABLE_HOURS, Math.ceil(hours * 4) / 4);
}

/**
 * Estimate driving duration using Google DirectionsService.
 * Requires GoogleMapsProvider to be mounted.
 */
export function estimateRoute(
  origin: PlaceValue,
  destination: PlaceValue,
): Promise<RouteEstimate | null> {
  return new Promise((resolve) => {
    if (
      typeof google === "undefined" ||
      !google.maps?.DirectionsService ||
      !origin.text ||
      !destination.text
    ) {
      resolve(null);
      return;
    }

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: origin.placeId ? { placeId: origin.placeId } : origin.text,
        destination: destination.placeId
          ? { placeId: destination.placeId }
          : destination.text,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !result?.routes[0]?.legs[0]) {
          resolve(null);
          return;
        }

        const leg = result.routes[0].legs[0];
        const durationMinutes = Math.ceil((leg.duration?.value ?? 0) / 60);
        const distanceMiles =
          Math.round(((leg.distance?.value ?? 0) / 1609.34) * 10) / 10;

        resolve({
          durationMinutes,
          durationHours: roundDurationHours(durationMinutes),
          distanceMiles,
          durationText: leg.duration?.text ?? `${durationMinutes} min`,
          distanceText: leg.distance?.text ?? `${distanceMiles} mi`,
        });
      },
    );
  });
}

export function applyRouteDurationToBookingTimes(
  pickupDate: Date,
  pickupTime: string,
  durationHours: number,
): { dropoffDate: Date; dropoffTime: string } {
  const match = pickupTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { dropoffDate: pickupDate, dropoffTime: pickupTime };
  }

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  const start = new Date(
    pickupDate.getFullYear(),
    pickupDate.getMonth(),
    pickupDate.getDate(),
    h,
    m,
  );
  const end = new Date(start.getTime() + durationHours * 3_600_000);

  const endH24 = end.getHours();
  const endM = end.getMinutes();
  const endPeriod = endH24 >= 12 ? "PM" : "AM";
  const endH12 = endH24 % 12 === 0 ? 12 : endH24 % 12;

  return {
    dropoffDate: end,
    dropoffTime: `${String(endH12).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endPeriod}`,
  };
}

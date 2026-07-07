import type { PlaceValue } from "@/app/components/booking/booking-types";
import type { RouteEstimate } from "./types";
import { fetchRouteEstimate, isMapsApiConfigured } from "@/lib/api/maps";

/**
 * Estimate driving route via backend Routes API.
 * Google Maps key stays on the server — not exposed to the browser.
 */
export async function estimateRoute(
  origin: PlaceValue,
  destination: PlaceValue,
  options?: { departureTime?: string },
): Promise<RouteEstimate | null> {
  if (!origin.text || !destination.text) return null;
  if (!isMapsApiConfigured()) return null;

  try {
    return await fetchRouteEstimate({
      origin,
      destination,
      departureTime: options?.departureTime,
    });
  } catch {
    return null;
  }
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

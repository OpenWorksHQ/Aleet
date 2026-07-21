import { apiFetch } from "@/lib/api";
import type { PlaceValue } from "@/app/components/booking/booking-types";
import type { RouteEstimate } from "@/lib/partner/types";

export type AddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

export type RouteEstimatePayload = {
  origin: PlaceValue;
  destination: PlaceValue;
  departureTime?: string;
};

export type ReverseGeocodeResult = {
  text: string;
  placeId: string;
};

export function createAutocompleteSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Server-side Places autocomplete (GOOGLE_MAPS_API_KEY stays on backend). */
export async function fetchAddressSuggestions(
  input: string,
  sessionToken: string,
  options?: { regionCode?: string },
): Promise<AddressSuggestion[]> {
  const res = await apiFetch<AddressSuggestion[]>("/maps/autocomplete", {
    method: "POST",
    body: {
      input,
      sessionToken,
      ...(options?.regionCode ? { regionCode: options.regionCode } : {}),
    },
  });
  return res.data ?? [];
}

/** Server-side reverse geocode (lat/lng → formatted address). */
export async function fetchReverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const res = await apiFetch<ReverseGeocodeResult>("/maps/reverse-geocode", {
    method: "POST",
    body: { latitude, longitude },
  });
  return res.data ?? null;
}

/** Server-side route estimate (Routes API on backend). */
export async function fetchRouteEstimate(
  payload: RouteEstimatePayload,
): Promise<RouteEstimate | null> {
  const res = await apiFetch<RouteEstimate>("/maps/route-estimate", {
    method: "POST",
    body: payload,
  });
  return res.data ?? null;
}

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  street: string;
  city: string;
  state: string;
  stateCode?: string;
  postalCode: string;
  country: string;
  lat: number | null;
  lng: number | null;
  displayName: string;
};

/** Server-side Places Details — full verified street address for partners / mileage. */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const res = await apiFetch<PlaceDetails>(
    `/maps/place-details?placeId=${encodeURIComponent(placeId)}`,
  );
  return res.data ?? null;
}

export function isMapsApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());
}

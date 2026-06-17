const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type DriverTripsTab = "available" | "mine" | "history";

export interface DriverTripStop {
  location: string;
  arrivalTime: string | null;
  timeType: string;
  dwellMinutes: number;
  notes: string | null;
}

export interface DriverDashboardTrip {
  id: string;
  status: string;
  region: { name: string; code: string } | null;
  pickupLocation: string;
  dropoffLocation: string;
  startDate: string;
  endDate: string;
  vehicleType: string;
  quantity: number;
  isMembershipTrip: boolean;
  driverEarnings: number;
  originalEarnings: number;
  specialNotes: string | null;
  stops: DriverTripStop[];
}

export interface DriverTripsStats {
  availableTrips: number;
  myTrips: number;
  completed: number;
  totalEarnings: number;
}

export interface DriverTripsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DriverDashboardTripsResponse {
  stats: DriverTripsStats;
  trips: DriverDashboardTrip[];
  pagination: DriverTripsPagination;
}

export interface DriverTripsParams {
  tab?: DriverTripsTab;
  search?: string;
  page?: number;
  limit?: number;
}

const EMPTY_RESPONSE: DriverDashboardTripsResponse = {
  stats: {
    availableTrips: 0,
    myTrips: 0,
    completed: 0,
    totalEarnings: 0,
  },
  trips: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeStop(input: unknown): DriverTripStop {
  const stop = (input ?? {}) as Partial<DriverTripStop>;
  return {
    location: toString(stop.location),
    arrivalTime: typeof stop.arrivalTime === "string" ? stop.arrivalTime : null,
    timeType: toString(stop.timeType) || "arrival",
    dwellMinutes: toNumber(stop.dwellMinutes, 0),
    notes: typeof stop.notes === "string" && stop.notes.trim() ? stop.notes : null,
  };
}

function normalizeTrip(input: unknown): DriverDashboardTrip {
  const trip = (input ?? {}) as Partial<DriverDashboardTrip>;
  const region = trip.region && typeof trip.region === "object"
    ? {
        name: toString((trip.region as { name?: unknown }).name),
        code: toString((trip.region as { code?: unknown }).code),
      }
    : null;

  return {
    id: toString(trip.id),
    status: toString(trip.status),
    region,
    pickupLocation: toString(trip.pickupLocation),
    dropoffLocation: toString(trip.dropoffLocation),
    startDate: toString(trip.startDate),
    endDate: toString(trip.endDate),
    vehicleType: toString(trip.vehicleType),
    quantity: toNumber(trip.quantity, 0),
    isMembershipTrip: Boolean(trip.isMembershipTrip),
    driverEarnings: toNumber(trip.driverEarnings, 0),
    originalEarnings: toNumber(trip.originalEarnings, 0),
    specialNotes:
      typeof trip.specialNotes === "string" && trip.specialNotes.trim()
        ? trip.specialNotes
        : null,
    stops: Array.isArray(trip.stops) ? trip.stops.map(normalizeStop) : [],
  };
}

function normalizeTripsResponse(input: unknown): DriverDashboardTripsResponse {
  const raw = (input ?? {}) as Partial<DriverDashboardTripsResponse>;

  return {
    stats: {
      availableTrips: toNumber(raw.stats?.availableTrips, 0),
      myTrips: toNumber(raw.stats?.myTrips, 0),
      completed: toNumber(raw.stats?.completed, 0),
      totalEarnings: toNumber(raw.stats?.totalEarnings, 0),
    },
    trips: Array.isArray(raw.trips) ? raw.trips.map(normalizeTrip) : [],
    pagination: {
      page: toNumber(raw.pagination?.page, 1),
      limit: toNumber(raw.pagination?.limit, 20),
      total: toNumber(raw.pagination?.total, 0),
      totalPages: Math.max(1, toNumber(raw.pagination?.totalPages, 1)),
    },
  };
}

function buildQuery(params: DriverTripsParams): string {
  const qs = new URLSearchParams();
  if (params.tab) qs.set("tab", params.tab);
  if (params.search) qs.set("search", params.search);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  return qs.toString();
}

function getClientToken(): string {
  return typeof document !== "undefined"
    ? (document.cookie
        .split("; ")
        .find((c) => c.startsWith("auth_token="))
        ?.split("=")[1] ?? "")
    : "";
}

export async function fetchDriverDashboardTrips(
  token: string,
  params: DriverTripsParams = {},
): Promise<DriverDashboardTripsResponse> {
  if (!BASE_URL || !token) return EMPTY_RESPONSE;

  const qs = buildQuery(params);
  const url = `${BASE_URL}/api/dashboard/driver/trips${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch driver trips");
  }

  const payload = json.data ?? json;
  return normalizeTripsResponse(payload);
}

export async function fetchDriverDashboardTripsClient(
  params: DriverTripsParams = {},
  signal?: AbortSignal,
): Promise<DriverDashboardTripsResponse> {
  const token = getClientToken();
  if (!BASE_URL || !token) return EMPTY_RESPONSE;

  const qs = buildQuery(params);
  const url = `${BASE_URL}/api/dashboard/driver/trips${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch driver trips");
  }

  const payload = json.data ?? json;
  return normalizeTripsResponse(payload);
}

/**
 * POST /api/bookings/accept — driver claims a trip.
 *
 * Race-safe on the backend: only one driver wins; everyone else gets a
 * 409 "Trip already taken" surfaced here as a thrown Error.
 */
export async function acceptTripClient(bookingId: string): Promise<void> {
  const token = getClientToken();
  if (!BASE_URL || !token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/api/bookings/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId, action: "accept" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to accept trip");
  }
}

/**
 * POST /api/bookings/driver-cancel — driver cancels a trip they previously
 * accepted. The booking returns to Pending so the admin can re-dispatch or
 * reassign. The backend increments the driver's cancellationCount.
 */
export async function cancelTripClient(
  bookingId: string,
  reason?: string,
): Promise<void> {
  const token = getClientToken();
  if (!BASE_URL || !token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/api/bookings/driver-cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId, ...(reason ? { reason } : {}) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to cancel trip");
  }
}

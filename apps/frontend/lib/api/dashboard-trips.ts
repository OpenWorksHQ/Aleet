import { apiFetch } from "@/lib/api";

export type DashboardTripStop = {
  location: string;
  timeType?: string;
  dwellMinutes?: number;
};

export type DashboardTripDriver = {
  id: string;
  name: string;
  phone: string | null;
};

export type DashboardTrip = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropoffLocation: string | null;
  freeRouting?: boolean;
  stops?: DashboardTripStop[];
  expectedPickupBy?: string | null;
  vehicleType: { id?: string; name: string; hourlyPrice?: number } | null;
  driver: DashboardTripDriver | null;
  quantity?: number;
  finalPrice?: number;
  timeElapsed?: number;
  timeRemaining?: number;
  progress?: number;
  canCancel?: boolean;
  canModify?: boolean;
  rating?: number | null;
  completedAt?: string | null;
};

type ActiveTripsPayload = { trips: DashboardTrip[]; count: number };
type UpcomingTripsPayload = { trips: DashboardTrip[]; count: number };
type TripHistoryPayload = {
  trips: DashboardTrip[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTrips: number;
  };
};

export async function fetchActiveTrips(token?: string) {
  return apiFetch<ActiveTripsPayload>("/dashboard/trips/active", { token });
}

export async function fetchUpcomingTrips(token?: string) {
  return apiFetch<UpcomingTripsPayload>("/dashboard/trips/upcoming", { token });
}

export async function fetchCompletedTrips(token?: string) {
  return apiFetch<TripHistoryPayload>("/dashboard/trips/history?status=Completed&limit=50", {
    token,
  });
}

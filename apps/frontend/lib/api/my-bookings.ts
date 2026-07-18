import { apiFetch } from "@/lib/api";

export type MyBookingAddon = {
  _id: string;
  name: string;
  description: string;
  type: "paid" | "free";
  price: number;
};

export type MyBookingVehicleType = {
  _id: string;
  name: string;
  description: string;
  hourlyPrice: number;
};

export type MyBookingStop = {
  location: string;
  timeType?: string;
  dwellMinutes?: number;
  addOnIds?: string[];
};

export type MyBooking = {
  _id: string;
  status: string;
  region: string;
  pickupLocation: string;
  dropoffLocation: string | null;
  freeRouting: boolean;
  dates: { startDate: string; endDate: string };
  vehicleType: MyBookingVehicleType;
  quantity: number;
  stops: MyBookingStop[];
  assignedDriver: { _id: string; name: string; phone?: string } | null;
  addOns: MyBookingAddon[];
  regularPrice: number;
  finalPrice: number;
  savings: number;
  paymentStatus: string;
  bookingDate: string;
  createdAt: string;
};

export function fetchMyBookings(token?: string) {
  return apiFetch<MyBooking[]>("/bookings/my", { token });
}

export function fetchBookingById(id: string, token?: string) {
  return apiFetch<MyBooking>(`/bookings/${id}`, { token });
}

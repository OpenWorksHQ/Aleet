export type BookingStop = {
  id: string;
  address: PlaceValue;
  time: string;
  notes: string;
};

export type PlaceValue = {
  text: string;
  placeId: string;
};

export type BookingData = {
  bookingMode: "buy_hours" | "multi_day" | "venue_access";
  pickupDate: Date | undefined;
  pickupTime: string;
  dropoffDate: Date | undefined;
  dropoffTime: string;
  vehicleType: string;
  vehicleTypeId: string;
  vehicleHourlyRate: number;
  region: string;
  regionId: string;

  pickupAddress: PlaceValue;
  dropoffAddress: PlaceValue;
  stops: BookingStop[];
  freeRouting: boolean;
  quantity: number;
  selectedAddons: string[];
  specialRequests: string;

  /** Partner / venue access attribution */
  partnerId?: string;
  partnerCode?: string;
  partnerName?: string;
  venueId?: string;
  pickupLocked?: boolean;
  dropoffLocked?: boolean;
  venueAccessBookingType?: string;
  allowedVehicleTypeIds?: string[];
  discountPct?: number;
  estimatedDurationHours?: number;
  routeDistanceMiles?: number;
  routeDurationText?: string;
};

export const EMPTY_BOOKING: BookingData = {
  bookingMode: "multi_day",
  pickupDate: undefined,
  pickupTime: "",
  dropoffDate: undefined,
  dropoffTime: "",
  vehicleType: "",
  vehicleTypeId: "",
  vehicleHourlyRate: 0,
  region: "",
  regionId: "",

  pickupAddress: { text: "", placeId: "" },
  dropoffAddress: { text: "", placeId: "" },
  stops: [],
  freeRouting: false,
  quantity: 1,
  selectedAddons: [],
  specialRequests: "",
};

export type BookingStop = {
  id: string;
  address: PlaceValue;
  /** Arrival time at this stop, "HH:MM AM/PM". Assumed to fall on the pickup date. */
  time: string;
  /** Optional free-text note for this stop (gate code, contact, instructions). */
  notes: string;
};

/** Stores both the display text and the stable Google placeId */
export type PlaceValue = {
  text: string; // human-readable address (for display only)
  placeId: string; // stable Google Place ID (save this to DB)
};

export type BookingData = {
  bookingMode: "buy_hours" | "multi_day";
  // Step 1
  pickupDate: Date | undefined;
  pickupTime: string;
  dropoffDate: Date | undefined;
  dropoffTime: string;
  vehicleType: string;
  vehicleTypeId: string;
  vehicleHourlyRate: number;
  region: string;
  regionId: string;

  // Step 2
  pickupAddress: PlaceValue;
  dropoffAddress: PlaceValue;
  stops: BookingStop[];
  freeRouting: boolean;
  quantity: number;
  selectedAddons: string[];
  specialRequests: string;
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

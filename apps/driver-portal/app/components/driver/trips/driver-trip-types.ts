export type DriverTripStatus =
  | "available"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export type TripAddon = {
  name: string;
  price: number;
};

export type TripStop = {
  address: string;
  duration: number;
};

export interface DriverTrip {
  id: string;
  bookingRef: string;
  status: DriverTripStatus;
  // Route
  pickupAddress: string;
  dropoffAddress: string;
  region: string;
  stops: TripStop[];
  // Schedule
  date: string; // ISO
  startTime: string;
  endTime: string;
  completedAt?: string; // ISO
  // Vehicle & customer
  vehicleType: string;
  vehicleCount: number;
  customerName: string;
  // Pricing
  basePrice: number;
  discountedPrice?: number;
  tip: number;
  addons: TripAddon[];
  // Meta
  rating?: number;
  distance?: string;
  estimatedDuration?: string;
  createdAt: string;
  updatedAt: string;
}

export const DRIVER_STATUS_LABELS: Record<DriverTripStatus, string> = {
  available: "Available",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const DRIVER_STATUS_COLORS: Record<DriverTripStatus, string> = {
  available: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  accepted: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  in_progress: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-400",
  expired: "border-border bg-border/20 text-muted",
};

export const mockDriverTrips: DriverTrip[] = [
  {
    id: "1",
    bookingRef: "#king_001",
    status: "completed",
    pickupAddress: "350 5th Ave, New York, NY",
    dropoffAddress: "JFK Airport, Queens, NY",
    region: "New York",
    stops: [],
    date: "2026-04-10",
    startTime: "12:00 PM",
    endTime: "02:00 PM",
    completedAt: "2026-04-10T14:00:00Z",
    vehicleType: "Sedan",
    vehicleCount: 1,
    customerName: "Alice Johnson",
    basePrice: 110,
    discountedPrice: 99,
    tip: 10,
    addons: [],
    rating: 5,
    distance: "18.4 mi",
    estimatedDuration: "45 min",
    createdAt: "2026-04-09T17:00:00Z",
    updatedAt: "2026-04-10T14:30:00Z",
  },
  {
    id: "2",
    bookingRef: "#king_007",
    status: "completed",
    pickupAddress: "Hollywood Bowl, Los Angeles, CA",
    dropoffAddress: "LAX Airport, Los Angeles, CA",
    region: "Los Angeles",
    stops: [],
    date: "2026-04-12",
    startTime: "08:00 AM",
    endTime: "09:30 AM",
    completedAt: "2026-04-12T09:35:00Z",
    vehicleType: "SUV",
    vehicleCount: 1,
    customerName: "Michael Torres",
    basePrice: 180,
    tip: 20,
    addons: [{ name: "Meet & Greet", price: 25 }],
    rating: 4,
    distance: "22.1 mi",
    estimatedDuration: "55 min",
    createdAt: "2026-04-10T10:00:00Z",
    updatedAt: "2026-04-12T09:35:00Z",
  },
  {
    id: "3",
    bookingRef: "#king_012",
    status: "available",
    pickupAddress: "Willis Tower, Chicago, IL",
    dropoffAddress: "O'Hare International Airport, Chicago, IL",
    region: "Chicago",
    stops: [{ address: "Navy Pier, Chicago", duration: 15 }],
    date: "2026-04-22",
    startTime: "06:00 AM",
    endTime: "08:00 AM",
    vehicleType: "Luxury",
    vehicleCount: 1,
    customerName: "Rachel Green",
    basePrice: 320,
    tip: 0,
    addons: [],
    distance: "31.5 mi",
    estimatedDuration: "1h 10min",
    createdAt: "2026-04-14T09:00:00Z",
    updatedAt: "2026-04-14T09:00:00Z",
  },
  {
    id: "4",
    bookingRef: "#king_015",
    status: "available",
    pickupAddress: "SFO Airport, San Francisco, CA",
    dropoffAddress: "Fisherman's Wharf, San Francisco, CA",
    region: "San Francisco",
    stops: [{ address: "Union Square, SF", duration: 30 }],
    date: "2026-04-22",
    startTime: "01:00 PM",
    endTime: "04:00 PM",
    vehicleType: "SUV",
    vehicleCount: 2,
    customerName: "Eva Chen",
    basePrice: 450,
    discountedPrice: 405,
    tip: 0,
    addons: [{ name: "Meet & Greet", price: 25 }],
    distance: "14.2 mi",
    estimatedDuration: "40 min",
    createdAt: "2026-04-18T12:00:00Z",
    updatedAt: "2026-04-18T12:00:00Z",
  },
  {
    id: "5",
    bookingRef: "#king_018",
    status: "accepted",
    pickupAddress: "Times Square, New York, NY",
    dropoffAddress: "Newark Liberty Airport, Newark, NJ",
    region: "New York",
    stops: [],
    date: "2026-04-21",
    startTime: "11:00 AM",
    endTime: "01:00 PM",
    vehicleType: "Sedan",
    vehicleCount: 1,
    customerName: "David Lee",
    basePrice: 240,
    tip: 0,
    addons: [],
    distance: "25.8 mi",
    estimatedDuration: "1h 5min",
    createdAt: "2026-04-19T15:00:00Z",
    updatedAt: "2026-04-19T16:00:00Z",
  },
];

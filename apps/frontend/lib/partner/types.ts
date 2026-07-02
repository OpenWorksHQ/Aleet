import type { PlaceValue } from "@/app/components/booking/booking-types";

export type PartnerType = "venue" | "affiliate" | "marketer";

/** Resolved partner context stored in cookie/localStorage for attribution. */
export type PartnerContext = {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerType: PartnerType;
  bookingMode: "venue_access" | "standard";
  /** Clean URL slug, e.g. welcome, lounge, mgm-grand */
  trackingSlug?: string;
  venueId?: string;
  pickupLocation?: PlaceValue;
  pickupLocked?: boolean;
  dropoffLocation?: PlaceValue;
  regionId?: string;
  regionName?: string;
  vehicleTypeId?: string;
  vehicleName?: string;
  vehicleHourlyRate?: number;
  allowedVehicleTypeIds?: string[];
  discountPct?: number;
  commissionPct?: number;
  pricingNote?: string;
};

export type RouteEstimate = {
  durationMinutes: number;
  durationHours: number;
  distanceMiles: number;
  durationText: string;
  distanceText: string;
};

export type PartnerApplicationPayload = {
  businessName: string;
  businessType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  website?: string;
  notes?: string;
};

export type PartnerApplicationRecord = PartnerApplicationPayload & {
  id: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  partnerCode?: string;
  venueSlug?: string;
};

export type PartnerDashboardStats = {
  partnerName: string;
  partnerCode: string;
  venueSlug?: string;
  commissionPct: number;
  totalBookings: number;
  completedBookings: number;
  pendingPayout: number;
  lifetimeEarnings: number;
  recentBookings: {
    id: string;
    date: string;
    route: string;
    amount: number;
    commission: number;
    status: "completed" | "upcoming" | "cancelled";
  }[];
};

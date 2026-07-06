import type { PlaceValue } from "@/app/components/booking/booking-types";

export type PartnerType = "venue" | "affiliate" | "marketer";

export type VenueAccessBookingType =
  | "venue_to_custom"
  | "custom_to_venue"
  | "venue_to_venue"
  | "custom_to_custom";

/** Resolved partner context stored in cookie/localStorage for attribution. */
export type PartnerContext = {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerType: PartnerType;
  bookingMode: "venue_access" | "standard";
  /** Clean URL slug, e.g. welcome, lounge, mgm-grand */
  trackingSlug?: string;
  venueSlug?: string;
  venueId?: string;
  pickupLocation?: PlaceValue;
  pickupLocked?: boolean;
  dropoffLocation?: PlaceValue;
  dropoffLocked?: boolean;
  venueAccessBookingType?: VenueAccessBookingType;
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
  trackingSlug?: string;
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

export type PartnerAuthUser = {
  id: string;
  email: string;
  name: string;
  role: "partner";
  accountStatus: "pending" | "active";
};

export type PartnerAuthSession = {
  token: string;
  user: PartnerAuthUser;
  partner: PartnerContext | null;
};

export type PartnerProfile = {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerType: PartnerType;
  bookingMode: "venue_access" | "standard";
  pickupLocation?: PlaceValue | null;
  address: string;
  city: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessName: string;
  website: string;
  notes: string;
};

export type PartnerUpdateRequestStatus = "pending" | "approved" | "rejected";

export type PartnerUpdateRequest = {
  _id: string;
  partner: string;
  requestedBy: string;
  status: PartnerUpdateRequestStatus;
  proposedChanges: Partial<PartnerProfile>;
  currentSnapshot: Partial<PartnerProfile>;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerUpdateRequestPayload = Partial<{
  pickupLocation: PlaceValue;
  address: string;
  city: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessName: string;
  website: string;
  notes: string;
}>;

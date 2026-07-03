import type { PartnerContext } from "./types";

/**
 * Mock partner registry — replace with GET /partners/resolve/:slug when backend is ready.
 */
const TRACKING_SLUGS: Record<string, PartnerContext> = {
  welcome: {
    partnerId: "mkt_welcome",
    partnerCode: "WELCOME",
    partnerName: "Welcome Campaign",
    partnerType: "marketer",
    bookingMode: "standard",
    trackingSlug: "welcome",
    commissionPct: 8,
  },
  business: {
    partnerId: "mkt_business",
    partnerCode: "BUSINESS",
    partnerName: "Business Travel",
    partnerType: "affiliate",
    bookingMode: "standard",
    trackingSlug: "business",
    commissionPct: 10,
  },
  lounge: {
    partnerId: "mkt_lounge",
    partnerCode: "LOUNGE",
    partnerName: "Lounge Partners",
    partnerType: "affiliate",
    bookingMode: "standard",
    trackingSlug: "lounge",
    commissionPct: 12,
  },
  rsvp: {
    partnerId: "mkt_rsvp",
    partnerCode: "RSVP",
    partnerName: "RSVP Events",
    partnerType: "marketer",
    bookingMode: "standard",
    trackingSlug: "rsvp",
    commissionPct: 10,
  },
};

const VENUE_SLUGS: Record<string, PartnerContext> = {
  "mgm-grand": {
    partnerId: "venue_mgm_grand",
    partnerCode: "MGMGRAND",
    partnerName: "MGM Grand",
    partnerType: "venue",
    bookingMode: "venue_access",
    trackingSlug: "mgm-grand",
    venueId: "venue_mgm_grand",
    pickupLocation: {
      text: "MGM Grand, 3799 S Las Vegas Blvd, Las Vegas, NV 89109",
      placeId: "",
    },
    pickupLocked: true,
    regionName: "Las Vegas",
    vehicleName: "Luxury Sedan",
    vehicleHourlyRate: 120,
    discountPct: 5,
    commissionPct: 12,
    pricingNote: "5% partner discount applied automatically",
  },
  "aria-resort": {
    partnerId: "venue_aria",
    partnerCode: "ARIA",
    partnerName: "Aria Resort & Casino",
    partnerType: "venue",
    bookingMode: "venue_access",
    trackingSlug: "aria-resort",
    venueId: "venue_aria",
    pickupLocation: {
      text: "Aria Resort & Casino, 3730 S Las Vegas Blvd, Las Vegas, NV 89158",
      placeId: "",
    },
    pickupLocked: true,
    regionName: "Las Vegas",
    vehicleName: "SUV",
    vehicleHourlyRate: 130,
    discountPct: 5,
    commissionPct: 12,
  },
  "hyatt-midtown": {
    partnerId: "venue_hyatt_nyc",
    partnerCode: "HYATTMID",
    partnerName: "Grand Hyatt New York",
    partnerType: "venue",
    bookingMode: "venue_access",
    trackingSlug: "hyatt-midtown",
    venueId: "venue_hyatt_nyc",
    pickupLocation: {
      text: "Grand Hyatt New York, 109 E 42nd St, New York, NY 10017",
      placeId: "",
    },
    pickupLocked: false,
    regionName: "New York",
    vehicleName: "Luxury Sedan",
    vehicleHourlyRate: 120,
    commissionPct: 10,
  },
};

const PARTNER_CODES: Record<string, PartnerContext> = {};

for (const ctx of [...Object.values(TRACKING_SLUGS), ...Object.values(VENUE_SLUGS)]) {
  PARTNER_CODES[ctx.partnerCode.toUpperCase()] = ctx;
}

export function resolveTrackingSlug(slug: string): PartnerContext | null {
  return TRACKING_SLUGS[slug.toLowerCase()] ?? null;
}

export function resolveVenueSlug(slug: string): PartnerContext | null {
  return VENUE_SLUGS[slug.toLowerCase()] ?? null;
}

export function resolvePartnerCode(code: string): PartnerContext | null {
  return PARTNER_CODES[code.trim().toUpperCase()] ?? null;
}

export function isTrackingSlug(slug: string): boolean {
  return slug.toLowerCase() in TRACKING_SLUGS;
}

export function isVenueSlug(slug: string): boolean {
  return slug.toLowerCase() in VENUE_SLUGS;
}

export function listVenuePartners(): PartnerContext[] {
  return Object.values(VENUE_SLUGS);
}

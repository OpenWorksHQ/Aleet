export type PartnerApplicationStatus = "pending" | "approved" | "rejected";

export type PartnerApplication = {
  id: string;
  businessName: string;
  businessType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  website?: string | null;
  notes?: string | null;
  status: PartnerApplicationStatus;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPartner = {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerType: "venue" | "affiliate_marketer" | "affiliate" | "marketer";
  bookingMode: "venue_access" | "standard";
  trackingSlug?: string;
  venueSlug?: string;
  discountPct?: number;
  commissionPct?: number;
  pricingNote?: string;
  status?: string;
  portalAccountStatus?: "pending" | "active" | null;
  portalEmail?: string | null;
};

export type PartnerUpdateRequestRecord = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  proposedChanges: Record<string, unknown>;
  currentSnapshot: Record<string, unknown>;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  partner?: {
    partnerName?: string;
    partnerCode?: string;
    partnerType?: string;
  };
  requestedBy?: {
    name?: string;
    email?: string;
  };
};

export type UpdatePartnerBody = {
  partnerType?: "venue" | "affiliate_marketer" | "affiliate" | "marketer";
  bookingMode?: "venue_access" | "standard";
  discountPct?: number;
  commissionPct?: number | null;
  pricingNote?: string;
};

export type ApprovePartnerApplicationBody = {
  partnerCode?: string;
  partnerType?: "venue" | "affiliate_marketer" | "affiliate" | "marketer";
  trackingSlug?: string;
  venueSlug?: string;
  discountPct?: number;
  commissionPct?: number;
  pricingNote?: string;
  pickupLocked?: boolean;
  dropoffLocked?: boolean;
  pickupLocation?: { text: string; placeId?: string };
};

export function inferVenueApplication(businessType: string): boolean {
  return ["hotel", "casino", "lounge", "venue", "resort"].some((term) =>
    businessType.toLowerCase().includes(term),
  );
}

export function normalizeApplication(raw: Record<string, unknown>): PartnerApplication {
  return {
    id: String(raw._id ?? raw.id ?? ""),
    businessName: String(raw.businessName ?? ""),
    businessType: String(raw.businessType ?? ""),
    contactName: String(raw.contactName ?? ""),
    contactEmail: String(raw.contactEmail ?? ""),
    contactPhone: String(raw.contactPhone ?? ""),
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    website: raw.website ? String(raw.website) : null,
    notes: raw.notes ? String(raw.notes) : null,
    status: (raw.status as PartnerApplicationStatus) ?? "pending",
    reviewedAt: raw.reviewedAt ? String(raw.reviewedAt) : null,
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : null,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export function normalizeAdminPartner(raw: Record<string, unknown>): AdminPartner {
  return {
    partnerId: String(raw.partnerId ?? raw._id ?? raw.id ?? ""),
    partnerCode: String(raw.partnerCode ?? ""),
    partnerName: String(raw.partnerName ?? ""),
    partnerType: (raw.partnerType as AdminPartner["partnerType"]) ?? "affiliate_marketer",
    bookingMode:
      (raw.bookingMode as AdminPartner["bookingMode"]) ??
      (raw.partnerType === "venue" ? "venue_access" : "standard"),
    trackingSlug: raw.trackingSlug ? String(raw.trackingSlug) : undefined,
    venueSlug: raw.venueSlug ? String(raw.venueSlug) : undefined,
    discountPct: typeof raw.discountPct === "number" ? raw.discountPct : undefined,
    commissionPct: typeof raw.commissionPct === "number" ? raw.commissionPct : undefined,
    pricingNote: raw.pricingNote ? String(raw.pricingNote) : undefined,
    status: raw.status ? String(raw.status) : undefined,
    portalAccountStatus: raw.portalAccountStatus as AdminPartner["portalAccountStatus"],
    portalEmail: raw.portalEmail ? String(raw.portalEmail) : null,
  };
}

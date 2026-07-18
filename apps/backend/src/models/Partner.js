const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  placeId: { type: String, default: '' },
}, { _id: false });

const partnerSchema = new mongoose.Schema({
  partnerCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  partnerName: { type: String, required: true, trim: true },
  partnerType: {
    type: String,
    enum: ['venue', 'affiliate', 'marketer'],
    required: true,
  },
  bookingMode: {
    type: String,
    enum: ['venue_access', 'standard'],
    default: 'standard',
  },
  // Omit field when unused — never store null (breaks unique indexes).
  trackingSlug: { type: String, lowercase: true, trim: true },
  venueSlug: { type: String, lowercase: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', default: null },
  defaultVehicleType: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType', default: null },
  allowedVehicleTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' }],
  pickupLocation: { type: placeSchema, default: null },
  pickupLocked: { type: Boolean, default: true },
  dropoffLocation: { type: placeSchema, default: null },
  dropoffLocked: { type: Boolean, default: false },
  dashboardAccessToken: { type: String, default: null, select: false },
  discountPct: { type: Number, default: 0, min: 0, max: 100 },
  commissionPct: { type: Number, default: null, min: 0, max: 100 },
  pricingNote: { type: String, default: null },
  contactName: { type: String, default: null },
  contactEmail: { type: String, default: null, lowercase: true, trim: true },
  contactPhone: { type: String, default: null },
  businessName: { type: String, default: null },
  businessType: { type: String, default: null },
  address: { type: String, default: null },
  city: { type: String, default: null },
  state: { type: String, default: null },
  /** Verified Google Places location for mileage / distance. */
  businessLocation: { type: placeSchema, default: null },
  website: { type: String, default: null },
  notes: { type: String, default: null },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerApplication', default: null },
  stats: {
    totalBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    lifetimeEarnings: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
  },
  /** Partner payout destination (UI + stored details; Stripe Connect later). */
  payoutAccount: {
    method: { type: String, enum: ['paypal', 'bank', null], default: null },
    paypalEmail: { type: String, default: null, lowercase: true, trim: true },
    accountHolderName: { type: String, default: null, trim: true },
    bankName: { type: String, default: null, trim: true },
    accountLast4: { type: String, default: null, trim: true },
    routingLast4: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['not_connected', 'connected'],
      default: 'not_connected',
    },
    updatedAt: { type: Date, default: null },
  },
}, { timestamps: true });

// Unique only when slug is a non-empty string — multiple partners can omit slugs.
partnerSchema.index(
  { trackingSlug: 1 },
  {
    unique: true,
    partialFilterExpression: {
      trackingSlug: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);
partnerSchema.index(
  { venueSlug: 1 },
  {
    unique: true,
    partialFilterExpression: {
      venueSlug: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);

module.exports = mongoose.model('Partner', partnerSchema);

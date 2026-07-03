const Partner = require('../models/Partner');
const PartnerApplication = require('../models/PartnerApplication');
const Booking = require('../models/Booking');
const Region = require('../models/Region');
const VehicleType = require('../models/Vehicle');
const TierSettings = require('../models/TierSettings');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generatePartnerCode(name) {
  const base = String(name || 'PARTNER')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12);
  return base || `P${Date.now().toString(36).toUpperCase()}`;
}

async function ensureUniquePartnerCode(baseName) {
  let code = generatePartnerCode(baseName);
  let suffix = 1;
  while (await Partner.findOne({ partnerCode: code })) {
    code = `${generatePartnerCode(baseName).slice(0, 8)}${suffix}`;
    suffix += 1;
  }
  return code;
}

async function ensureUniqueVenueSlug(baseName) {
  let slug = slugify(baseName);
  if (!slug) slug = `venue-${Date.now().toString(36)}`;
  let suffix = 1;
  let candidate = slug;
  while (await Partner.exists({ venueSlug: candidate })) {
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function ensureUniqueTrackingSlug(baseName) {
  let slug = slugify(baseName);
  if (!slug) slug = `link-${Date.now().toString(36)}`;
  let suffix = 1;
  let candidate = slug;
  while (await Partner.exists({ trackingSlug: candidate })) {
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function normalizeSlug(value) {
  const slug = slugify(value);
  return slug || undefined;
}

async function assertUniquePartnerSlugs({ trackingSlug, venueSlug, excludePartnerId } = {}) {
  const normalizedTracking = normalizeSlug(trackingSlug);
  const normalizedVenue = normalizeSlug(venueSlug);
  const excludeId = excludePartnerId ? String(excludePartnerId) : null;

  if (normalizedTracking) {
    const conflict = await Partner.findOne({ trackingSlug: normalizedTracking }).select('_id partnerName').lean();
    if (conflict && String(conflict._id) !== excludeId) {
      const err = new Error(`Tracking slug "${normalizedTracking}" is already used by ${conflict.partnerName}`);
      err.code = 'SLUG_CONFLICT';
      err.field = 'trackingSlug';
      throw err;
    }
  }

  if (normalizedVenue) {
    const conflict = await Partner.findOne({ venueSlug: normalizedVenue }).select('_id partnerName').lean();
    if (conflict && String(conflict._id) !== excludeId) {
      const err = new Error(`Venue slug "${normalizedVenue}" is already used by ${conflict.partnerName}`);
      err.code = 'SLUG_CONFLICT';
      err.field = 'venueSlug';
      throw err;
    }
  }

  return {
    trackingSlug: normalizedTracking,
    venueSlug: normalizedVenue,
  };
}

function applyPartnerSlugFields(target, { trackingSlug, venueSlug }) {
  if (trackingSlug !== undefined) {
    if (trackingSlug) target.trackingSlug = trackingSlug;
    else delete target.trackingSlug;
  }
  if (venueSlug !== undefined) {
    if (venueSlug) target.venueSlug = venueSlug;
    else delete target.venueSlug;
  }
  return target;
}

async function repairPartnerSlugFields() {
  await Partner.updateMany(
    { $or: [{ venueSlug: null }, { venueSlug: '' }] },
    { $unset: { venueSlug: '' } },
  );
  await Partner.updateMany(
    { $or: [{ trackingSlug: null }, { trackingSlug: '' }] },
    { $unset: { trackingSlug: '' } },
  );
}

async function syncPartnerSlugIndexes() {
  const collection = Partner.collection;
  for (const name of ['venueSlug_1', 'trackingSlug_1']) {
    try {
      await collection.dropIndex(name);
    } catch {
      // index may not exist yet
    }
  }
  await Partner.syncIndexes();
}

async function populatePartnerContext(partnerDoc) {
  const partner = partnerDoc.toObject ? partnerDoc.toObject() : partnerDoc;
  const [region, vehicle] = await Promise.all([
    partner.region ? Region.findById(partner.region).select('name').lean() : null,
    partner.defaultVehicleType
      ? VehicleType.findById(partner.defaultVehicleType).select('name hourlyPrice').lean()
      : null,
  ]);

  return toPartnerContextDTO(partner, region, vehicle);
}

function toPartnerContextDTO(partner, region = null, vehicle = null) {
  const isVenue = partner.partnerType === 'venue';
  return {
    partnerId: String(partner._id),
    partnerCode: partner.partnerCode,
    partnerName: partner.partnerName,
    partnerType: partner.partnerType,
    bookingMode: partner.bookingMode || (isVenue ? 'venue_access' : 'standard'),
    trackingSlug: partner.trackingSlug || undefined,
    venueSlug: partner.venueSlug || undefined,
    venueId: isVenue ? String(partner._id) : undefined,
    pickupLocation: partner.pickupLocation || undefined,
    pickupLocked: partner.pickupLocked,
    regionId: partner.region ? String(partner.region) : undefined,
    regionName: region?.name,
    vehicleTypeId: partner.defaultVehicleType ? String(partner.defaultVehicleType) : undefined,
    vehicleName: vehicle?.name,
    vehicleHourlyRate: vehicle?.hourlyRate,
    allowedVehicleTypeIds: (partner.allowedVehicleTypes || []).map(String),
    discountPct: partner.discountPct || 0,
    commissionPct: partner.commissionPct ?? undefined,
    pricingNote: partner.pricingNote || undefined,
  };
}

async function resolvePartnerBySlug(slug) {
  const normalized = slugify(slug);
  if (!normalized) return null;

  const partner = await Partner.findOne({
    status: 'active',
    $or: [{ trackingSlug: normalized }, { venueSlug: normalized }],
  });
  if (!partner) return null;
  return populatePartnerContext(partner);
}

async function resolvePartnerByCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;

  const partner = await Partner.findOne({ partnerCode: normalized, status: 'active' });
  if (!partner) return null;
  return populatePartnerContext(partner);
}

async function resolveBookingPartner(body = {}) {
  const { partnerId, partnerCode, venueId, promoCode } = body;
  const code = String(partnerCode || promoCode || '').trim().toUpperCase();

  if (partnerId) {
    const partner = await Partner.findOne({ _id: partnerId, status: 'active' });
    if (partner) return partner;
  }

  if (venueId) {
    const partner = await Partner.findOne({
      _id: venueId,
      status: 'active',
      partnerType: 'venue',
    });
    if (partner) return partner;
  }

  if (code) {
    const partner = await Partner.findOne({ partnerCode: code, status: 'active' });
    if (partner) return partner;
  }

  return null;
}

function computePartnerAdjustments(partner, tierSettings, subtotalBeforeDiscount) {
  const base = Number(subtotalBeforeDiscount) || 0;
  const discountPct = Number(partner.discountPct) || 0;
  const discountAmount = Number((base * (discountPct / 100)).toFixed(2));
  const finalPrice = Number(Math.max(0, base - discountAmount).toFixed(2));

  const isVenue = partner.partnerType === 'venue';
  const defaultPct = isVenue
    ? Number(tierSettings?.venueCommissionPct || 0)
    : Number(tierSettings?.affiliateCommissionPct || 0);
  const commissionPct = partner.commissionPct ?? defaultPct;
  const commissionAmount = Number((finalPrice * (commissionPct / 100)).toFixed(2));

  return {
    discountPct,
    discountAmount,
    commissionPct,
    commissionAmount,
    finalPrice,
  };
}

function buildPartnerBookingSnapshot(partner, adjustments) {
  return {
    partner: partner._id,
    partnerCode: partner.partnerCode,
    partnerName: partner.partnerName,
    partnerType: partner.partnerType,
    venueId: partner.partnerType === 'venue' ? partner._id : null,
    discountPct: adjustments.discountPct,
    discountAmount: adjustments.discountAmount,
    commissionPct: adjustments.commissionPct,
    commissionAmount: adjustments.commissionAmount,
  };
}

async function recordPartnerBookingStarted(partnerId) {
  if (!partnerId) return;
  await Partner.updateOne(
    { _id: partnerId },
    { $inc: { 'stats.totalBookings': 1 } },
  );
}

async function recordPartnerBookingCompleted(partnerId, commissionAmount = 0) {
  if (!partnerId) return;
  const amount = Number(commissionAmount) || 0;
  await Partner.updateOne(
    { _id: partnerId },
    {
      $inc: {
        'stats.completedBookings': 1,
        'stats.lifetimeEarnings': amount,
        'stats.pendingPayout': amount,
      },
    },
  );
}

async function getPartnerDashboard(partnerId) {
  const partner = await Partner.findById(partnerId);
  if (!partner) return null;

  const recentBookings = await Booking.find({ 'partner.partner': partner._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('pickupLocation dropoffLocation finalPrice status createdAt partner.commissionAmount dates')
    .lean();

  const isVenue = partner.partnerType === 'venue';
  const tierSettings = await TierSettings.findOne().lean();
  const defaultPct = isVenue
    ? Number(tierSettings?.venueCommissionPct || 0)
    : Number(tierSettings?.affiliateCommissionPct || 0);

  return {
    partnerName: partner.partnerName,
    partnerCode: partner.partnerCode,
    venueSlug: partner.venueSlug || undefined,
    commissionPct: partner.commissionPct ?? defaultPct,
    totalBookings: partner.stats?.totalBookings || 0,
    completedBookings: partner.stats?.completedBookings || 0,
    pendingPayout: Number((partner.stats?.pendingPayout || 0).toFixed(2)),
    lifetimeEarnings: Number((partner.stats?.lifetimeEarnings || 0).toFixed(2)),
    recentBookings: recentBookings.map((booking) => ({
      id: String(booking._id),
      date: booking.createdAt?.toISOString?.().slice(0, 10) || '',
      route: `${booking.pickupLocation || 'Pickup'} → ${booking.dropoffLocation || 'Drop-off'}`,
      amount: Number(booking.finalPrice || 0),
      commission: Number(booking.partner?.commissionAmount || 0),
      status: mapBookingStatusForDashboard(booking.status),
    })),
  };
}

function mapBookingStatusForDashboard(status) {
  if (status === 'Completed') return 'completed';
  if (status === 'Cancelled' || status === 'Expired') return 'cancelled';
  return 'upcoming';
}

async function createPartnerFromApplication(application, adminUserId, overrides = {}) {
  const partnerCode = overrides.partnerCode || await ensureUniquePartnerCode(application.businessName);
  const isVenue = ['hotel', 'casino', 'lounge', 'venue', 'resort'].some((term) =>
    String(application.businessType || '').toLowerCase().includes(term),
  );

  const rawVenueSlug = isVenue
    ? (overrides.venueSlug || await ensureUniqueVenueSlug(application.businessName))
    : undefined;
  const rawTrackingSlug = !isVenue && overrides.trackingSlug
    ? overrides.trackingSlug
    : undefined;

  const slugs = await assertUniquePartnerSlugs({
    trackingSlug: rawTrackingSlug,
    venueSlug: rawVenueSlug,
  });

  const payload = {
    partnerCode,
    partnerName: application.businessName,
    partnerType: overrides.partnerType || (isVenue ? 'venue' : 'affiliate'),
    bookingMode: isVenue ? 'venue_access' : 'standard',
    pickupLocation: overrides.pickupLocation || {
      text: `${application.address}, ${application.city}, ${application.state}`,
      placeId: '',
    },
    pickupLocked: isVenue,
    discountPct: overrides.discountPct ?? 5,
    commissionPct: overrides.commissionPct ?? null,
    pricingNote: overrides.pricingNote || null,
    contactName: application.contactName,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
    businessName: application.businessName,
    businessType: application.businessType,
    address: application.address,
    city: application.city,
    state: application.state,
    website: application.website,
    application: application._id,
    region: overrides.region || null,
    defaultVehicleType: overrides.defaultVehicleType || null,
  };

  applyPartnerSlugFields(payload, slugs);

  const partner = await Partner.create(payload);

  application.status = 'approved';
  application.reviewedAt = new Date();
  application.reviewedBy = adminUserId;
  application.partner = partner._id;
  await application.save();

  return partner;
}

module.exports = {
  slugify,
  normalizeSlug,
  generatePartnerCode,
  ensureUniquePartnerCode,
  ensureUniqueVenueSlug,
  ensureUniqueTrackingSlug,
  assertUniquePartnerSlugs,
  applyPartnerSlugFields,
  repairPartnerSlugFields,
  syncPartnerSlugIndexes,
  populatePartnerContext,
  toPartnerContextDTO,
  resolvePartnerBySlug,
  resolvePartnerByCode,
  resolveBookingPartner,
  computePartnerAdjustments,
  buildPartnerBookingSnapshot,
  recordPartnerBookingStarted,
  recordPartnerBookingCompleted,
  getPartnerDashboard,
  createPartnerFromApplication,
};

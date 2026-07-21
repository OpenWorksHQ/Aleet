const Partner = require('../models/Partner');
const PartnerApplication = require('../models/PartnerApplication');
const PartnerUpdateRequest = require('../models/PartnerUpdateRequest');
const Booking = require('../models/Booking');
const Region = require('../models/Region');
const VehicleType = require('../models/Vehicle');
const TierSettings = require('../models/TierSettings');
const User = require('../models/User');
const crypto = require('crypto');

function normalizeContactEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate partner contact email for applications, profile updates, and admin actions.
 * @returns {{ ok: true } | { ok: false, field: 'contactEmail', code: string, message: string, action?: 'login' | 'support' }}
 */
async function validatePartnerContactEmail(email, { excludePartnerId, excludeApplicationId } = {}) {
  const normalized = normalizeContactEmail(email);
  if (!normalized) {
    return {
      ok: false,
      field: 'contactEmail',
      code: 'required',
      message: 'Contact email is required.',
    };
  }

  if (!isValidEmailFormat(normalized)) {
    return {
      ok: false,
      field: 'contactEmail',
      code: 'invalid_format',
      message: 'Enter a valid email address.',
    };
  }

  const pendingQuery = {
    contactEmail: normalized,
    status: 'pending',
  };
  if (excludeApplicationId) {
    pendingQuery._id = { $ne: excludeApplicationId };
  }

  const pendingApplication = await PartnerApplication.findOne(pendingQuery).lean();

  if (pendingApplication) {
    return {
      ok: false,
      field: 'contactEmail',
      code: 'pending_application',
      message: 'An application with this email is already under review. We will contact you once it is processed.',
    };
  }

  const partnerQuery = { contactEmail: normalized, status: 'active' };
  if (excludePartnerId) {
    partnerQuery._id = { $ne: excludePartnerId };
  }

  const existingPartner = await Partner.findOne(partnerQuery).select('partnerName').lean();
  if (existingPartner) {
    return {
      ok: false,
      field: 'contactEmail',
      code: 'partner_registered',
      message: `This email is already registered to ${existingPartner.partnerName}. Sign in to your partner dashboard or contact support for help.`,
      action: 'login',
    };
  }

  const portalUser = await User.findOne({ email: normalized, role: 'partner' })
    .select('partnerProfile')
    .lean();

  if (portalUser) {
    const linkedId = portalUser.partnerProfile?.partnerId
      ? String(portalUser.partnerProfile.partnerId)
      : null;
    const accountStatus = portalUser.partnerProfile?.accountStatus;

    if (excludePartnerId && linkedId === String(excludePartnerId)) {
      return { ok: true };
    }

    if (linkedId && excludePartnerId && linkedId !== String(excludePartnerId)) {
      return {
        ok: false,
        field: 'contactEmail',
        code: 'portal_linked_other',
        message: 'This contact email is already linked to a different partner portal account. Use a different email or contact support.',
        action: 'support',
      };
    }

    if (linkedId) {
      const linkedPartner = await Partner.findById(linkedId).select('partnerName').lean();
      const partnerLabel = linkedPartner?.partnerName || 'another partner';

      if (accountStatus === 'active') {
        return {
          ok: false,
          field: 'contactEmail',
          code: 'portal_active',
          message: `This email already has an active partner portal account for ${partnerLabel}. Sign in instead of submitting a new application.`,
          action: 'login',
        };
      }

      return {
        ok: false,
        field: 'contactEmail',
        code: 'portal_invite_pending',
        message: 'A partner portal invite was already sent to this email. Check your inbox, or use Forgot password on the partner sign-in page to get a fresh activation link.',
        action: 'login',
      };
    }

    if (accountStatus === 'active') {
      return {
        ok: false,
        field: 'contactEmail',
        code: 'portal_active',
        message: 'This email already has a partner portal account. Sign in instead of submitting a new application.',
        action: 'login',
      };
    }
  }

  return { ok: true };
}

function formatContactEmailValidationError(result) {
  if (result.ok) return null;
  return {
    message: result.message,
    errors: {
      contactEmail: {
        code: result.code,
        action: result.action,
      },
    },
  };
}

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

function generateDashboardAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function resolveVenueAccessBookingType(partner) {
  const pickupLocked = partner.pickupLocked !== false;
  const dropoffLocked = partner.dropoffLocked === true;
  if (pickupLocked && dropoffLocked) return 'venue_to_venue';
  if (pickupLocked) return 'venue_to_custom';
  if (dropoffLocked) return 'custom_to_venue';
  return 'custom_to_custom';
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
    dropoffLocation: partner.dropoffLocation || undefined,
    dropoffLocked: partner.dropoffLocked === true,
    venueAccessBookingType: resolveVenueAccessBookingType(partner),
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
    trackingSlug: partner.trackingSlug || undefined,
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
  const partnerType = overrides.partnerType || (isVenue ? 'venue' : 'affiliate_marketer');
  const isAffiliateType =
    partnerType === 'affiliate'
    || partnerType === 'marketer'
    || partnerType === 'affiliate_marketer';
  const normalizedType = isVenue
    ? 'venue'
    : (isAffiliateType ? 'affiliate_marketer' : partnerType);
  const rawTrackingSlug = !isVenue && isAffiliateType
    ? (overrides.trackingSlug || await ensureUniqueTrackingSlug(application.businessName))
    : (!isVenue && overrides.trackingSlug ? overrides.trackingSlug : undefined);

  const slugs = await assertUniquePartnerSlugs({
    trackingSlug: rawTrackingSlug,
    venueSlug: rawVenueSlug,
  });

  const pickupLocation = overrides.pickupLocation || {
    text: application.businessLocation?.text
      || `${application.address}, ${application.city}, ${application.state}`,
    placeId: application.businessLocation?.placeId || '',
  };

  const payload = {
    partnerCode,
    partnerName: application.businessName,
    partnerType: normalizedType,
    bookingMode: isVenue ? 'venue_access' : 'standard',
    pickupLocation,
    pickupLocked: overrides.pickupLocked ?? isVenue,
    dropoffLocation: overrides.dropoffLocked
      ? (overrides.dropoffLocation || pickupLocation)
      : (overrides.dropoffLocation || null),
    dropoffLocked: overrides.dropoffLocked ?? false,
    dashboardAccessToken: generateDashboardAccessToken(),
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
    businessLocation: application.businessLocation || {
      text: pickupLocation.text,
      placeId: pickupLocation.placeId || '',
    },
    website: application.website,
    notes: application.notes || null,
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

async function authenticatePartnerDashboard(partnerCode, contactEmail) {
  const code = String(partnerCode || '').trim().toUpperCase();
  const email = String(contactEmail || '').trim().toLowerCase();
  if (!code || !email) return null;

  const partner = await Partner.findOne({
    partnerCode: code,
    contactEmail: email,
    status: 'active',
  }).select('+dashboardAccessToken');

  if (!partner) return null;

  if (!partner.dashboardAccessToken) {
    partner.dashboardAccessToken = generateDashboardAccessToken();
    await partner.save();
  }

  const context = await populatePartnerContext(partner);
  return {
    partner: context,
    dashboardAccessToken: partner.dashboardAccessToken,
  };
}

async function verifyPartnerDashboardAccess(partnerId, token) {
  if (!partnerId || !token) return false;
  const partner = await Partner.findById(partnerId).select('+dashboardAccessToken');
  if (!partner || partner.status !== 'active') return false;
  return partner.dashboardAccessToken === String(token).trim();
}

const PARTNER_REQUESTABLE_FIELDS = [
  'pickupLocation',
  'businessLocation',
  'address',
  'city',
  'state',
  'contactName',
  'contactEmail',
  'contactPhone',
  'businessName',
  'website',
  'notes',
];

function buildPartnerProfileSnapshot(partner) {
  const p = partner.toObject ? partner.toObject() : partner;
  return {
    pickupLocation: p.pickupLocation || null,
    businessLocation: p.businessLocation || null,
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    contactName: p.contactName || '',
    contactEmail: p.contactEmail || '',
    contactPhone: p.contactPhone || '',
    businessName: p.businessName || p.partnerName || '',
    website: p.website || '',
    notes: p.notes || '',
  };
}

function buildPartnerPayoutDTO(partner) {
  const p = partner.toObject ? partner.toObject() : partner;
  const acct = p.payoutAccount || {};
  return {
    method: acct.method || null,
    paypalEmail: acct.paypalEmail || '',
    accountHolderName: acct.accountHolderName || '',
    bankName: acct.bankName || '',
    accountLast4: acct.accountLast4 || '',
    routingLast4: acct.routingLast4 || '',
    status: acct.status || 'not_connected',
    updatedAt: acct.updatedAt || null,
    pendingPayout: Number(p.stats?.pendingPayout || 0),
    lifetimeEarnings: Number(p.stats?.lifetimeEarnings || 0),
    commissionPct: p.commissionPct ?? null,
  };
}

async function upsertPartnerPayoutAccount(partnerId, body = {}) {
  const partner = await Partner.findById(partnerId);
  if (!partner) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  const method = body.method === 'bank' || body.method === 'paypal' ? body.method : null;
  if (!method) {
    const err = new Error('Payout method must be paypal or bank');
    err.statusCode = 400;
    throw err;
  }

  const next = {
    method,
    paypalEmail: null,
    accountHolderName: String(body.accountHolderName || '').trim() || null,
    bankName: null,
    accountLast4: null,
    routingLast4: null,
    status: 'connected',
    updatedAt: new Date(),
  };

  if (method === 'paypal') {
    const email = String(body.paypalEmail || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('A valid PayPal email is required');
      err.statusCode = 400;
      throw err;
    }
    next.paypalEmail = email;
  } else {
    const accountLast4 = String(body.accountLast4 || '').replace(/\D/g, '').slice(-4);
    const routingLast4 = String(body.routingLast4 || '').replace(/\D/g, '').slice(-4);
    if (accountLast4.length !== 4 || routingLast4.length !== 4) {
      const err = new Error('Enter the last 4 digits of routing and account numbers');
      err.statusCode = 400;
      throw err;
    }
    if (!next.accountHolderName) {
      const err = new Error('Account holder name is required');
      err.statusCode = 400;
      throw err;
    }
    next.bankName = String(body.bankName || '').trim() || null;
    next.accountLast4 = accountLast4;
    next.routingLast4 = routingLast4;
  }

  partner.payoutAccount = next;
  await partner.save();
  return buildPartnerPayoutDTO(partner);
}

function buildPartnerProfileDTO(partner) {
  const snapshot = buildPartnerProfileSnapshot(partner);
  return {
    partnerId: String(partner._id),
    partnerCode: partner.partnerCode,
    partnerName: partner.partnerName,
    partnerType: partner.partnerType,
    bookingMode: partner.bookingMode,
    ...snapshot,
    payoutAccount: buildPartnerPayoutDTO(partner),
  };
}

function pickRequestableChanges(body = {}) {
  const changes = {};
  for (const field of PARTNER_REQUESTABLE_FIELDS) {
    if (body[field] === undefined) continue;
    if (field === 'pickupLocation' || field === 'businessLocation') {
      changes[field] = {
        text: String(body[field]?.text || '').trim(),
        placeId: String(body[field]?.placeId || '').trim(),
      };
    } else if (field === 'contactEmail') {
      changes.contactEmail = String(body[field]).trim().toLowerCase();
    } else {
      changes[field] = String(body[field]).trim();
    }
  }
  return changes;
}

async function submitPartnerUpdateRequest(partnerId, userId, body) {
  const partner = await Partner.findById(partnerId);
  if (!partner) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  const pending = await PartnerUpdateRequest.findOne({ partner: partnerId, status: 'pending' });
  if (pending) {
    const err = new Error('You already have a pending update request. Wait for admin review before submitting another.');
    err.statusCode = 409;
    throw err;
  }

  const proposedChanges = pickRequestableChanges(body);
  if (!Object.keys(proposedChanges).length) {
    const err = new Error('No valid changes provided');
    err.statusCode = 400;
    throw err;
  }

  if (proposedChanges.contactEmail) {
    const emailCheck = await validatePartnerContactEmail(proposedChanges.contactEmail, {
      excludePartnerId: partnerId,
    });
    if (!emailCheck.ok) {
      const err = new Error(emailCheck.message);
      err.statusCode = 409;
      err.field = emailCheck.field;
      err.code = emailCheck.code;
      err.action = emailCheck.action;
      throw err;
    }
  }

  const request = await PartnerUpdateRequest.create({
    partner: partnerId,
    requestedBy: userId,
    status: 'pending',
    proposedChanges,
    currentSnapshot: buildPartnerProfileSnapshot(partner),
  });

  return request;
}

async function listPartnerUpdateRequestsForPartner(partnerId) {
  return PartnerUpdateRequest.find({ partner: partnerId })
    .sort({ createdAt: -1 })
    .lean();
}

async function listPartnerUpdateRequestsAdmin({ status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    PartnerUpdateRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('partner', 'partnerName partnerCode partnerType')
      .populate('requestedBy', 'name email')
      .lean(),
    PartnerUpdateRequest.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

async function approvePartnerUpdateRequest(requestId, adminUserId) {
  const request = await PartnerUpdateRequest.findById(requestId);
  if (!request) {
    const err = new Error('Update request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'pending') {
    const err = new Error('Update request is not pending');
    err.statusCode = 400;
    throw err;
  }

  const partner = await Partner.findById(request.partner);
  if (!partner) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  const changes = request.proposedChanges?.toObject?.()
    ? request.proposedChanges.toObject()
    : request.proposedChanges;

  for (const [field, value] of Object.entries(changes || {})) {
    if (!PARTNER_REQUESTABLE_FIELDS.includes(field)) continue;
    partner[field] = value;
    if (field === 'businessName' && value) {
      partner.partnerName = value;
    }
  }

  await partner.save();

  try {
    const { syncPartnerPortalUserFromPartner } = require('./partnerAuthService');
    await syncPartnerPortalUserFromPartner(partner);
  } catch (err) {
    // Don't block approval if portal sync fails (e.g. email conflict) — surface later via resend.
    console.error('syncPartnerPortalUserFromPartner after update-request approve:', err?.message);
  }

  request.status = 'approved';
  request.reviewedBy = adminUserId;
  request.reviewedAt = new Date();
  await request.save();

  return { request, partner: buildPartnerProfileDTO(partner) };
}

async function rejectPartnerUpdateRequest(requestId, adminUserId, reason) {
  const request = await PartnerUpdateRequest.findById(requestId);
  if (!request) {
    const err = new Error('Update request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'pending') {
    const err = new Error('Update request is not pending');
    err.statusCode = 400;
    throw err;
  }

  request.status = 'rejected';
  request.reviewedBy = adminUserId;
  request.reviewedAt = new Date();
  request.rejectionReason = reason ? String(reason).trim() : null;
  await request.save();

  return request;
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
  validatePartnerContactEmail,
  formatContactEmailValidationError,
  authenticatePartnerDashboard,
  verifyPartnerDashboardAccess,
  generateDashboardAccessToken,
  resolveVenueAccessBookingType,
  PARTNER_REQUESTABLE_FIELDS,
  buildPartnerProfileSnapshot,
  buildPartnerProfileDTO,
  buildPartnerPayoutDTO,
  upsertPartnerPayoutAccount,
  submitPartnerUpdateRequest,
  listPartnerUpdateRequestsForPartner,
  listPartnerUpdateRequestsAdmin,
  approvePartnerUpdateRequest,
  rejectPartnerUpdateRequest,
};

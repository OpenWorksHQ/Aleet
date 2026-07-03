const asyncHandler = require('express-async-handler');
const Partner = require('../models/Partner');
const PartnerApplication = require('../models/PartnerApplication');
const {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendPaginated,
} = require('../utils/responseHelper');
const { getPagination } = require('../utils/queryHelper');
const {
  createPartnerFromApplication,
  populatePartnerContext,
  normalizeSlug,
  ensureUniquePartnerCode,
  assertUniquePartnerSlugs,
  applyPartnerSlugFields,
  generateDashboardAccessToken,
} = require('../services/partnerService');

const listApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const status = req.query.status;

  const filter = {};
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    PartnerApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PartnerApplication.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Partner applications loaded', items, {
    page,
    limit,
    total,
  });
});

const approveApplication = asyncHandler(async (req, res) => {
  const application = await PartnerApplication.findById(req.params.id);
  if (!application) return sendNotFound(res, 'Application not found');
  if (application.status === 'approved') {
    return sendValidationError(res, 'Application is already approved');
  }

  try {
    const partner = await createPartnerFromApplication(application, req.user.id, req.body || {});
    const context = await populatePartnerContext(partner);
    return sendSuccess(res, 200, 'Partner application approved', {
      application,
      partner: context,
    });
  } catch (err) {
    if (err.code === 'SLUG_CONFLICT') {
      return sendValidationError(res, err.message);
    }
    throw err;
  }
});

const rejectApplication = asyncHandler(async (req, res) => {
  const application = await PartnerApplication.findById(req.params.id);
  if (!application) return sendNotFound(res, 'Application not found');
  if (application.status === 'approved') {
    return sendValidationError(res, 'Approved applications cannot be rejected');
  }

  application.status = 'rejected';
  application.reviewedAt = new Date();
  application.reviewedBy = req.user.id;
  application.rejectionReason = req.body?.reason ? String(req.body.reason).trim() : null;
  await application.save();

  return sendSuccess(res, 200, 'Partner application rejected', application);
});

const listPartners = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.partnerType) filter.partnerType = req.query.partnerType;

  const [items, total] = await Promise.all([
    Partner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Partner.countDocuments(filter),
  ]);

  const data = await Promise.all(items.map((partner) => populatePartnerContext(partner)));

  return sendPaginated(res, 'Partners loaded', data, {
    page,
    limit,
    total,
  });
});

const createPartner = asyncHandler(async (req, res) => {
  const {
    partnerName,
    partnerType = 'affiliate',
    partnerCode,
    trackingSlug,
    venueSlug,
    bookingMode,
    region,
    defaultVehicleType,
    pickupLocation,
    pickupLocked,
    discountPct,
    commissionPct,
    pricingNote,
    contactName,
    contactEmail,
    contactPhone,
    businessName,
    businessType,
    address,
    city,
    state,
    website,
  } = req.body || {};

  if (!partnerName || !String(partnerName).trim()) {
    return sendValidationError(res, 'partnerName is required');
  }

  const code = partnerCode
    ? String(partnerCode).trim().toUpperCase()
    : await ensureUniquePartnerCode(partnerName);

  let slugs;
  try {
    slugs = await assertUniquePartnerSlugs({
      trackingSlug: trackingSlug || undefined,
      venueSlug: venueSlug || (partnerType === 'venue' ? partnerName : undefined),
    });
  } catch (err) {
    if (err.code === 'SLUG_CONFLICT') {
      return sendValidationError(res, err.message);
    }
    throw err;
  }

  const payload = {
    partnerCode: code,
    partnerName: String(partnerName).trim(),
    partnerType,
    bookingMode: bookingMode || (partnerType === 'venue' ? 'venue_access' : 'standard'),
    region: region || null,
    defaultVehicleType: defaultVehicleType || null,
    pickupLocation: pickupLocation || null,
    pickupLocked: pickupLocked ?? partnerType === 'venue',
    discountPct: discountPct ?? 0,
    commissionPct: commissionPct ?? null,
    pricingNote: pricingNote || null,
    contactName: contactName || null,
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
    businessName: businessName || partnerName,
    businessType: businessType || null,
    address: address || null,
    city: city || null,
    state: state || null,
    website: website || null,
  };

  applyPartnerSlugFields(payload, slugs);
  payload.dashboardAccessToken = generateDashboardAccessToken();

  const partner = await Partner.create(payload);

  const context = await populatePartnerContext(partner);
  return sendSuccess(res, 201, 'Partner created', context);
});

const updatePartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) return sendNotFound(res, 'Partner not found');

  const slugPatch = {};
  if (req.body.trackingSlug !== undefined) {
    slugPatch.trackingSlug = normalizeSlug(req.body.trackingSlug);
  }
  if (req.body.venueSlug !== undefined) {
    slugPatch.venueSlug = normalizeSlug(req.body.venueSlug);
  }

  if (Object.keys(slugPatch).length > 0) {
    try {
      await assertUniquePartnerSlugs({
        trackingSlug: slugPatch.trackingSlug ?? partner.trackingSlug,
        venueSlug: slugPatch.venueSlug ?? partner.venueSlug,
        excludePartnerId: partner._id,
      });
    } catch (err) {
      if (err.code === 'SLUG_CONFLICT') {
        return sendValidationError(res, err.message);
      }
      throw err;
    }
    applyPartnerSlugFields(partner, slugPatch);
  }

  const fields = [
    'partnerName', 'partnerType', 'bookingMode', 'status', 'region',
    'defaultVehicleType', 'pickupLocation', 'pickupLocked', 'discountPct',
    'commissionPct', 'pricingNote', 'contactName', 'contactEmail', 'contactPhone',
    'businessName', 'businessType', 'address', 'city', 'state', 'website',
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      partner[field] = req.body[field];
    }
  }

  if (req.body.partnerType !== undefined) {
    partner.bookingMode = req.body.bookingMode
      ?? (partner.partnerType === 'venue' ? 'venue_access' : 'standard');
  }

  if (req.body.commissionPct === null) {
    partner.commissionPct = undefined;
  }

  if (req.body.partnerCode !== undefined) {
    partner.partnerCode = String(req.body.partnerCode).trim().toUpperCase();
  }

  await partner.save();
  const context = await populatePartnerContext(partner);
  return sendSuccess(res, 200, 'Partner updated', context);
});

module.exports = {
  listApplications,
  approveApplication,
  rejectApplication,
  listPartners,
  createPartner,
  updatePartner,
};

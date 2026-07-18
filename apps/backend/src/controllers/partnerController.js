const asyncHandler = require('express-async-handler');
const PartnerApplication = require('../models/PartnerApplication');
const {
  sendSuccess,
  sendValidationError,
  sendNotFound,
} = require('../utils/responseHelper');
const { normalizeWebsiteUrl } = require('../utils/normalizeWebsite');
const {
  resolvePartnerBySlug,
  resolvePartnerByCode,
  getPartnerDashboard,
  validatePartnerContactEmail,
  formatContactEmailValidationError,
} = require('../services/partnerService');

const resolvePartner = asyncHandler(async (req, res) => {
  const partner = await resolvePartnerBySlug(req.params.slug);
  if (!partner) return sendNotFound(res, 'Partner not found');
  return sendSuccess(res, 200, 'Partner resolved', partner);
});

const validateCode = asyncHandler(async (req, res) => {
  const { code } = req.body || {};
  if (!code || !String(code).trim()) {
    return sendValidationError(res, 'Partner code is required');
  }

  const partner = await resolvePartnerByCode(code);
  if (!partner) return sendNotFound(res, 'Partner code not recognized');
  return sendSuccess(res, 200, 'Partner recognized', partner);
});

const checkApplicationEmail = asyncHandler(async (req, res) => {
  const email = req.query.email;
  if (!email || !String(email).trim()) {
    return sendValidationError(res, 'Email is required');
  }

  const result = await validatePartnerContactEmail(email);
  if (!result.ok) {
    const formatted = formatContactEmailValidationError(result);
    return sendValidationError(res, formatted.message, formatted.errors);
  }

  return sendSuccess(res, 200, 'Email is available', { available: true });
});

const submitApplication = asyncHandler(async (req, res) => {
  const {
    businessName,
    businessType,
    contactName,
    contactEmail,
    contactPhone,
    address,
    city,
    state,
    businessLocation,
    website,
    notes,
  } = req.body || {};

  const required = {
    businessName,
    businessType,
    contactName,
    contactEmail,
    contactPhone,
    address,
    city,
    state,
  };

  for (const [field, value] of Object.entries(required)) {
    if (!value || !String(value).trim()) {
      return sendValidationError(res, `${field} is required`, {
        [field]: { code: 'required' },
      });
    }
  }

  const placeText = String(businessLocation?.text || address || '').trim();
  const placeId = String(businessLocation?.placeId || '').trim();
  if (!placeText || !placeId) {
    return sendValidationError(res, 'Select a verified Google business address from the suggestions.', {
      businessLocation: { code: 'place_required' },
    });
  }

  const emailCheck = await validatePartnerContactEmail(contactEmail);
  if (!emailCheck.ok) {
    const formatted = formatContactEmailValidationError(emailCheck);
    return sendValidationError(res, formatted.message, formatted.errors);
  }

  let normalizedWebsite = null;
  if (website && String(website).trim()) {
    try {
      normalizedWebsite = normalizeWebsiteUrl(website);
    } catch (err) {
      return sendValidationError(res, err.message, {
        website: { code: 'invalid_format' },
      });
    }
  }

  const application = await PartnerApplication.create({
    businessName: String(businessName).trim(),
    businessType: String(businessType).trim(),
    contactName: String(contactName).trim(),
    contactEmail: String(contactEmail).trim().toLowerCase(),
    contactPhone: String(contactPhone).trim(),
    address: String(address).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    businessLocation: { text: placeText, placeId },
    website: normalizedWebsite,
    notes: notes ? String(notes).trim() : null,
  });

  return sendSuccess(res, 201, 'Application submitted for review.', {
    id: String(application._id),
    businessName: application.businessName,
    businessType: application.businessType,
    contactName: application.contactName,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
    address: application.address,
    city: application.city,
    state: application.state,
    businessLocation: application.businessLocation,
    website: application.website,
    notes: application.notes,
    status: application.status,
    submittedAt: application.createdAt.toISOString(),
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getPartnerDashboard(req.params.partnerId);
  if (!dashboard) return sendNotFound(res, 'Partner not found');
  return sendSuccess(res, 200, 'Partner dashboard loaded', dashboard);
});

module.exports = {
  resolvePartner,
  validateCode,
  checkApplicationEmail,
  submitApplication,
  getDashboard,
};

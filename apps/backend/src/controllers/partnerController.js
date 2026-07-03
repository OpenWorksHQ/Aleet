const asyncHandler = require('express-async-handler');
const PartnerApplication = require('../models/PartnerApplication');
const {
  sendSuccess,
  sendValidationError,
  sendNotFound,
} = require('../utils/responseHelper');
const {
  resolvePartnerBySlug,
  resolvePartnerByCode,
  getPartnerDashboard,
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
      return sendValidationError(res, `${field} is required`);
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
    website: website ? String(website).trim() : null,
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
  submitApplication,
  getDashboard,
};

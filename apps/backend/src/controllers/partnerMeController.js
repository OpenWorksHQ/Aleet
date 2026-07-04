const asyncHandler = require('express-async-handler');
const {
  sendSuccess,
  sendError,
  sendNotFound,
} = require('../utils/responseHelper');
const {
  getPartnerDashboard,
  buildPartnerProfileDTO,
  submitPartnerUpdateRequest,
  listPartnerUpdateRequestsForPartner,
  validatePartnerContactEmail,
  formatContactEmailValidationError,
} = require('../services/partnerService');
const Partner = require('../models/Partner');

function handleServiceError(res, err) {
  if (err.statusCode) {
    const errors = err.field
      ? { [err.field]: { code: err.code, action: err.action } }
      : null;
    return sendError(res, err.statusCode, err.message, errors);
  }
  throw err;
}

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getPartnerDashboard(req.partnerId);
  if (!dashboard) return sendNotFound(res, 'Partner not found');
  return sendSuccess(res, 200, 'Partner dashboard loaded', dashboard);
});

const getProfile = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.partnerId);
  if (!partner) return sendNotFound(res, 'Partner not found');
  return sendSuccess(res, 200, 'Partner profile loaded', buildPartnerProfileDTO(partner));
});

const listUpdateRequests = asyncHandler(async (req, res) => {
  const requests = await listPartnerUpdateRequestsForPartner(req.partnerId);
  return sendSuccess(res, 200, 'Update requests loaded', requests);
});

const createUpdateRequest = asyncHandler(async (req, res) => {
  try {
    const request = await submitPartnerUpdateRequest(
      req.partnerId,
      req.user.id,
      req.body || {},
    );
    return sendSuccess(res, 201, 'Update request submitted for admin review', request);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

const checkContactEmail = asyncHandler(async (req, res) => {
  const email = req.query.email;
  if (!email || !String(email).trim()) {
    return sendError(res, 400, 'Email is required');
  }

  const result = await validatePartnerContactEmail(email, { excludePartnerId: req.partnerId });
  if (!result.ok) {
    const formatted = formatContactEmailValidationError(result);
    return sendError(res, 409, formatted.message, formatted.errors);
  }

  return sendSuccess(res, 200, 'Email is available', { available: true });
});

module.exports = {
  getDashboard,
  getProfile,
  listUpdateRequests,
  createUpdateRequest,
  checkContactEmail,
};

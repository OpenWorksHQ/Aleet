const asyncHandler = require('express-async-handler');
const {
  sendSuccess,
  sendValidationError,
  sendError,
} = require('../utils/responseHelper');
const {
  loginPartner,
  setPasswordFromInvite,
  forgotPartnerPassword,
  resetPartnerPassword,
  getPartnerAuthMe,
  PartnerAuthError,
} = require('../services/partnerAuthService');

function handleAuthError(res, err) {
  if (err instanceof PartnerAuthError) {
    return sendError(res, err.statusCode, err.message);
  }
  throw err;
}

const login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const data = await loginPartner({ email, password });
    return sendSuccess(res, 200, 'Signed in successfully', data);
  } catch (err) {
    return handleAuthError(res, err);
  }
});

const setPassword = asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body || {};
    const data = await setPasswordFromInvite({ token, password });
    return sendSuccess(res, 200, 'Password set successfully', data);
  } catch (err) {
    return handleAuthError(res, err);
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return sendValidationError(res, 'Email is required');
    const data = await forgotPartnerPassword({ email });
    return sendSuccess(res, 200, data.message, data);
  } catch (err) {
    return handleAuthError(res, err);
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body || {};
    const data = await resetPartnerPassword({ token, password });
    return sendSuccess(res, 200, data.message, data);
  } catch (err) {
    return handleAuthError(res, err);
  }
});

const me = asyncHandler(async (req, res) => {
  try {
    const data = await getPartnerAuthMe(req.user.id);
    return sendSuccess(res, 200, 'Partner session loaded', data);
  } catch (err) {
    return handleAuthError(res, err);
  }
});

module.exports = {
  login,
  setPassword,
  forgotPassword,
  resetPassword,
  me,
};

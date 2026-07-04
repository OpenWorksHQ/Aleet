const asyncHandler = require('express-async-handler');
const {
  sendSuccess,
  sendError,
  sendPaginated,
} = require('../utils/responseHelper');
const { getPagination } = require('../utils/queryHelper');
const {
  listPartnerUpdateRequestsAdmin,
  approvePartnerUpdateRequest,
  rejectPartnerUpdateRequest,
} = require('../services/partnerService');

function handleServiceError(res, err) {
  if (err.statusCode) {
    return sendError(res, err.statusCode, err.message);
  }
  throw err;
}

const listUpdateRequests = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const { items, total } = await listPartnerUpdateRequestsAdmin({
    status: req.query.status,
    page,
    limit,
  });

  return sendPaginated(res, 'Partner update requests loaded', items, {
    page,
    limit,
    total,
  });
});

const approveUpdateRequest = asyncHandler(async (req, res) => {
  try {
    const result = await approvePartnerUpdateRequest(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Update request approved', result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

const rejectUpdateRequest = asyncHandler(async (req, res) => {
  try {
    const request = await rejectPartnerUpdateRequest(
      req.params.id,
      req.user.id,
      req.body?.reason,
    );
    return sendSuccess(res, 200, 'Update request rejected', request);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

module.exports = {
  listUpdateRequests,
  approveUpdateRequest,
  rejectUpdateRequest,
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendUnauthorized, sendForbidden } = require('../utils/responseHelper');

async function requirePartnerAuth(req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendUnauthorized(res, 'Partner authentication required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'partner') {
      return sendForbidden(res, 'Partner access only');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.active || user.role !== 'partner') {
      return sendUnauthorized(res, 'Partner account not found');
    }

    if (user.partnerProfile?.accountStatus !== 'active') {
      return sendForbidden(res, 'Partner portal account is not activated');
    }

    if (!user.partnerProfile?.partnerId) {
      return sendForbidden(res, 'Partner account is not linked to a partner record');
    }

    req.user = user;
    req.partnerId = String(user.partnerProfile.partnerId);
    next();
  } catch {
    return sendUnauthorized(res, 'Invalid or expired token');
  }
}

module.exports = requirePartnerAuth;

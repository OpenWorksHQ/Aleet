const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendUnauthorized } = require('../utils/responseHelper');
const { verifyPartnerDashboardAccess } = require('../services/partnerService');

async function requirePartnerDashboardAccess(req, res, next) {
  const partnerId = req.params.partnerId;
  const partnerToken = req.headers['x-partner-token'];

  if (partnerToken && (await verifyPartnerDashboardAccess(partnerId, partnerToken))) {
    return next();
  }

  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.role === 'admin' && user.active) {
        req.user = user;
        return next();
      }
    } catch {
      // fall through
    }
  }

  return sendUnauthorized(
    res,
    'Partner dashboard access denied. Sign in with your partner code and contact email.',
  );
}

module.exports = requirePartnerDashboardAccess;

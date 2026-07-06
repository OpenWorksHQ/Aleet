const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendUnauthorized } = require('../utils/responseHelper');

async function requirePartnerDashboardAccess(req, res, next) {
  const partnerId = req.params.partnerId;
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === 'partner') {
        const user = await User.findById(decoded.id).select('-password');
        if (
          user
          && user.active
          && user.partnerProfile?.accountStatus === 'active'
          && String(user.partnerProfile?.partnerId) === String(partnerId)
        ) {
          req.user = user;
          req.partnerId = String(user.partnerProfile.partnerId);
          return next();
        }
      }

      if (decoded.role === 'admin') {
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.active && user.role === 'admin') {
          req.user = user;
          return next();
        }
      }
    } catch {
      // fall through
    }
  }

  return sendUnauthorized(
    res,
    'Partner dashboard access denied. Sign in with your partner portal account.',
  );
}

module.exports = requirePartnerDashboardAccess;

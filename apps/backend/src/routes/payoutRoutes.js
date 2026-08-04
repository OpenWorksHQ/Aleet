const express = require('express');
const router = express.Router();
const { payoutSingleBooking, payoutEligibleBookings, payoutToAccount } = require('../controllers/payoutController');
const authenticateJWT = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');
const { validate } = require('../middleware/validate');
const {
  payoutBookingParams,
  payoutRunQuery,
  payoutToAccountBody,
} = require('../validators/payoutValidators');

// A driver may only release the payout for a trip they were assigned (enforced
// in the controller). Bulk and manual transfers move company money, so they are
// admin-only. Every input here ends up in a Stripe transfer, so it is validated
// before the handler runs.
router.post(
  '/booking/:id',
  authenticateJWT,
  validate({ params: payoutBookingParams }),
  payoutSingleBooking
);
router.post(
  '/run',
  authenticateJWT,
  requireAdmin,
  requirePermission('manage-users'),
  validate({ query: payoutRunQuery }),
  payoutEligibleBookings
);
router.post(
  '/payoutToAccount',
  authenticateJWT,
  requireAdmin,
  requirePermission('super-admin'),
  validate({ body: payoutToAccountBody }),
  payoutToAccount
);

module.exports = router;

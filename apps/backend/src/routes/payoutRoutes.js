const express = require('express');
const router = express.Router();
const { payoutSingleBooking, payoutEligibleBookings, payoutToAccount } = require('../controllers/payoutController');
const authenticateJWT = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');

// A driver may only release the payout for a trip they were assigned (enforced
// in the controller). Bulk and manual transfers move company money, so they are
// admin-only.
router.post('/booking/:id', authenticateJWT, payoutSingleBooking);
router.post('/run', authenticateJWT, requireAdmin, requirePermission('manage-users'), payoutEligibleBookings);
router.post('/payoutToAccount', authenticateJWT, requireAdmin, requirePermission('super-admin'), payoutToAccount);

module.exports = router;

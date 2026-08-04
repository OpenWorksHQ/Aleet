const express = require('express');
const router = express.Router();
const { listPackages, inviteDriver, webhook, simulateClearReport } = require('../controllers/checkrController');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');


// show packages to admin — exposes Checkr account/package configuration
router.get('/packages', requireAdmin, requirePermission('view-reports'), listPackages);

// manually send invite (if not auto) — each call triggers a BILLABLE Checkr
// background check, so it is admin-only (was any authenticated user).
router.post('/drivers/:id/invite', requireAdmin, requirePermission('manage-users'), inviteDriver);

// webhook receiver (NO auth, raw body needed for signature verification)
router.post('/webhooks/checkr', express.raw({ type: '*/*' }), webhook);

// TEMP admin endpoint: simulate "report.completed" with result "clear"
router.post('/admin/drivers/:id/simulate-clear', requireAdmin, simulateClearReport);

module.exports = router;

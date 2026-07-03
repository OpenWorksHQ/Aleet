const express = require('express');
const {
  resolvePartner,
  validateCode,
  submitApplication,
  getDashboard,
  dashboardAuth,
} = require('../controllers/partnerController');
const requirePartnerDashboardAccess = require('../middleware/requirePartnerDashboardAccess');

const router = express.Router();

router.get('/resolve/:slug', resolvePartner);
router.post('/validate-code', validateCode);
router.post('/applications', submitApplication);
router.post('/dashboard-auth', dashboardAuth);
router.get('/:partnerId/dashboard', requirePartnerDashboardAccess, getDashboard);

module.exports = router;

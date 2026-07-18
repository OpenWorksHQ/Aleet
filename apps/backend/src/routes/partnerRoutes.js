const express = require('express');
const {
  resolvePartner,
  validateCode,
  checkApplicationEmail,
  submitApplication,
  getDashboard,
} = require('../controllers/partnerController');
const partnerAuthController = require('../controllers/partnerAuthController');
const partnerMeController = require('../controllers/partnerMeController');
const requirePartnerAuth = require('../middleware/requirePartnerAuth');
const requirePartnerDashboardAccess = require('../middleware/requirePartnerDashboardAccess');

const router = express.Router();

router.get('/resolve/:slug', resolvePartner);
router.post('/validate-code', validateCode);
router.get('/applications/check-email', checkApplicationEmail);
router.post('/applications', submitApplication);

router.post('/auth/login', partnerAuthController.login);
router.post('/auth/set-password', partnerAuthController.setPassword);
router.post('/auth/forgot-password', partnerAuthController.forgotPassword);
router.post('/auth/reset-password', partnerAuthController.resetPassword);
router.get('/auth/me', requirePartnerAuth, partnerAuthController.me);

router.get('/me/dashboard', requirePartnerAuth, partnerMeController.getDashboard);
router.get('/me/profile', requirePartnerAuth, partnerMeController.getProfile);
router.get('/me/payout', requirePartnerAuth, partnerMeController.getPayout);
router.put('/me/payout', requirePartnerAuth, partnerMeController.updatePayout);
router.get('/me/check-contact-email', requirePartnerAuth, partnerMeController.checkContactEmail);
router.get('/me/update-requests', requirePartnerAuth, partnerMeController.listUpdateRequests);
router.post('/me/update-requests', requirePartnerAuth, partnerMeController.createUpdateRequest);

router.get('/:partnerId/dashboard', requirePartnerDashboardAccess, getDashboard);

module.exports = router;

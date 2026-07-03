const express = require('express');
const {
  resolvePartner,
  validateCode,
  submitApplication,
  getDashboard,
} = require('../controllers/partnerController');

const router = express.Router();

router.get('/resolve/:slug', resolvePartner);
router.post('/validate-code', validateCode);
router.post('/applications', submitApplication);
router.get('/:partnerId/dashboard', getDashboard);

module.exports = router;

const express = require('express');
const authenticateJWT = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');
const {
  listApplications,
  approveApplication,
  rejectApplication,
  listPartners,
  createPartner,
  updatePartner,
  resendPortalInvite,
} = require('../controllers/adminPartnerController');
const {
  listUpdateRequests,
  approveUpdateRequest,
  rejectUpdateRequest,
} = require('../controllers/adminPartnerUpdateRequestController');

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/applications', requirePermission('view-reports'), listApplications);
router.patch('/applications/:id/approve', requirePermission('manage-users'), approveApplication);
router.patch('/applications/:id/reject', requirePermission('manage-users'), rejectApplication);

router.get('/update-requests', requirePermission('view-reports'), listUpdateRequests);
router.patch('/update-requests/:id/approve', requirePermission('manage-users'), approveUpdateRequest);
router.patch('/update-requests/:id/reject', requirePermission('manage-users'), rejectUpdateRequest);

router.get('/', requirePermission('view-reports'), listPartners);
router.post('/', requirePermission('manage-users'), createPartner);
router.patch('/:id', requirePermission('manage-users'), updatePartner);
router.post('/:id/resend-invite', requirePermission('manage-users'), resendPortalInvite);

module.exports = router;

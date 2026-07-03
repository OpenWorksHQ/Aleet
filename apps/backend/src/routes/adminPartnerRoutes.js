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
} = require('../controllers/adminPartnerController');

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/applications', requirePermission('view-reports'), listApplications);
router.patch('/applications/:id/approve', requirePermission('manage-users'), approveApplication);
router.patch('/applications/:id/reject', requirePermission('manage-users'), rejectApplication);

router.get('/', requirePermission('view-reports'), listPartners);
router.post('/', requirePermission('manage-users'), createPartner);
router.patch('/:id', requirePermission('manage-users'), updatePartner);

module.exports = router;

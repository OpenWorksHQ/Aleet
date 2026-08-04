const express = require('express');
const {
    getRegions,
    getAllRegions,
    getSameDayStatus,
    addRegion,
    updateRegion,
    deleteRegion,
} = require('../controllers/regionController');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');
const { validate } = require('../middleware/validate');
const {
    createRegionBody,
    updateRegionBody,
    regionIdParams,
    sameDayStatusQuery,
} = require('../validators/regionValidators');

const router = express.Router();

// Public — used by booking wizard to populate region dropdown
router.get('/', getRegions);

// Public — live same-day availability for a region (used by the booking flow)
router.get(
    '/:id/same-day-status',
    validate({ params: regionIdParams, query: sameDayStatusQuery }),
    getSameDayStatus
);

// Admin only — regions drive dispatch eligibility and same-day availability, so
// writes must be admin-gated (authenticateJWT alone accepted any customer or
// driver token).
router.get('/all', requireAdmin, requirePermission('view-reports'), getAllRegions);
router.post(
    '/',
    requireAdmin,
    requirePermission('manage-users'),
    validate({ body: createRegionBody }),
    addRegion
);
router.put(
    '/:id',
    requireAdmin,
    requirePermission('manage-users'),
    validate({ params: regionIdParams, body: updateRegionBody }),
    updateRegion
);
router.delete(
    '/:id',
    requireAdmin,
    requirePermission('manage-users'),
    validate({ params: regionIdParams }),
    deleteRegion
);

module.exports = router;

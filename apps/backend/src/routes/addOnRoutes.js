const express = require('express');
const { addAddOn, getAllAddOns, updateAddOn, deleteAddOn } = require('../controllers/addOnController');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');
const { validate } = require('../middleware/validate');
const {
  createAddOnBody,
  updateAddOnBody,
  addOnIdParams,
} = require('../validators/addOnValidators');
const router = express.Router();

// Add-ons are priced catalogue items — writes must be admin-gated
// (authenticateJWT alone accepted any customer or driver token).
router.post(
  '/add',
  requireAdmin,
  requirePermission('manage-users'),
  validate({ body: createAddOnBody }),
  addAddOn
);

// Route to get all available add-ons (for customers while booking) — public
router.get('/', getAllAddOns);

router.put(
  '/update/:id',
  requireAdmin,
  requirePermission('manage-users'),
  validate({ params: addOnIdParams, body: updateAddOnBody }),
  updateAddOn
);
router.delete(
  '/delete/:id',
  requireAdmin,
  requirePermission('manage-users'),
  validate({ params: addOnIdParams }),
  deleteAddOn
);

module.exports = router;

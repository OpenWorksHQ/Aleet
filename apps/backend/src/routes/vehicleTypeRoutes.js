const express = require('express');
const {
  addVehicleType,
  getAllVehicleTypes,
  updateVehicleType,
  deleteVehicleType
} = require('../controllers/vehicleController');
const requireAdmin = require('../middleware/requireAdmin');
const { validate } = require('../middleware/validate');
const {
  createVehicleTypeBody,
  updateVehicleTypeBody,
  vehicleTypeIdParams,
  listVehicleTypesQuery,
} = require('../validators/vehicleTypeValidators');

const router = express.Router();

router.post('/add', requireAdmin, validate({ body: createVehicleTypeBody }), addVehicleType);
router.get('/', validate({ query: listVehicleTypesQuery }), getAllVehicleTypes);
router.put(
  '/update/:id',
  requireAdmin,
  validate({ params: vehicleTypeIdParams, body: updateVehicleTypeBody }),
  updateVehicleType
);
router.delete(
  '/delete/:id',
  requireAdmin,
  validate({ params: vehicleTypeIdParams }),
  deleteVehicleType
); // ✅ Delete API

module.exports = router;

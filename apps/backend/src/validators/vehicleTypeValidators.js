/**
 * validators/vehicleTypeValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/vehicleTypeRoutes.js.
 *
 * `hourlyPrice` is the base rate every booking price is derived from, and
 * `VehicleType.findOne({ name })` reads `name` straight from the body. The
 * create message reuses the controller's existing wording.
 * ---------------------------------------------------------------------------
 */

const {
  z,
  LIMITS,
  objectId,
  requiredString,
  optionalString,
  amount,
  booleanLike,
} = require('./common');

const NAME_MAX = 120;
const REQUIRED_MESSAGE = 'Name, description, and hourly price are required';

/**
 * POST /api/vehicle-types/add
 * `hourlyPrice` has a 0.01 floor because the controller's `!hourlyPrice` guard
 * already rejected 0 with the same message.
 */
const createVehicleTypeBody = z.looseObject({
  name: requiredString('Name', { max: NAME_MAX, message: REQUIRED_MESSAGE }),
  description: requiredString('Description', {
    max: LIMITS.LONG_TEXT,
    message: REQUIRED_MESSAGE,
  }),
  hourlyPrice: amount('Hourly price', {
    min: 0.01,
    max: 100_000,
    missingMessage: REQUIRED_MESSAGE,
  }),
  isPrivate: booleanLike('isPrivate').optional().nullable(),
});

/** PUT /api/vehicle-types/update/:id — partial update. */
const updateVehicleTypeBody = z.looseObject({
  name: optionalString('Name', { max: NAME_MAX }),
  description: optionalString('Description', { max: LIMITS.LONG_TEXT }),
  hourlyPrice: amount('Hourly price', { min: 0, max: 100_000 }).optional().nullable(),
  isPrivate: booleanLike('isPrivate').optional().nullable(),
});

/** Any `/:id` vehicle-type route. */
const vehicleTypeIdParams = z.object({
  id: objectId('Vehicle type ID', { message: 'Invalid vehicle type ID' }),
});

/** GET /api/vehicle-types?includePrivate=1 */
const listVehicleTypesQuery = z.looseObject({
  includePrivate: optionalString('includePrivate', { max: 10 }),
});

module.exports = {
  createVehicleTypeBody,
  updateVehicleTypeBody,
  vehicleTypeIdParams,
  listVehicleTypesQuery,
};

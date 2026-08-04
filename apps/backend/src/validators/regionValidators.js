/**
 * validators/regionValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/regionRoutes.js.
 *
 * `addRegion` builds `Region.findOne({ $or: [{ name }, { code }] })` from the
 * body, so a non-string `name` is a direct operator-injection path. `updateRegion`
 * calls `name.trim()` on whatever it is handed, which threw a 500 on `null`.
 *
 * The create messages reuse the controller's "Name and code are required" so
 * the existing 400 response is unchanged.
 * ---------------------------------------------------------------------------
 */

const { z, objectId, requiredString, optionalString, booleanLike } = require('./common');

const NAME_MAX = 120;
const CODE_MAX = 20;
const REQUIRED_MESSAGE = 'Name and code are required';

/** POST /api/regions */
const createRegionBody = z.looseObject({
  name: requiredString('Name', { max: NAME_MAX, message: REQUIRED_MESSAGE }),
  code: requiredString('Code', { max: CODE_MAX, message: REQUIRED_MESSAGE }),
});

/**
 * PUT /api/regions/:id — every field is a partial update. Note these are
 * `.optional()` and NOT `.nullable()`: the controller treats "not undefined" as
 * "update me" and immediately calls `.trim()`, so an explicit `null` has never
 * been a valid update and now fails with a 400 instead of a 500.
 */
const updateRegionBody = z.looseObject({
  name: optionalString('Name', { max: NAME_MAX }),
  code: optionalString('Code', { max: CODE_MAX }),
  isActive: booleanLike('isActive').optional(),
  sameDayManualBlock: booleanLike('sameDayManualBlock').optional(),
});

/** Any `/:id` region route. */
const regionIdParams = z.object({
  id: objectId('Region ID', { message: 'Invalid region ID' }),
});

/** GET /api/regions/:id/same-day-status — optional trip window. */
const sameDayStatusQuery = z.looseObject({
  startDate: optionalString('startDate', { max: 64 }),
  endDate: optionalString('endDate', { max: 64 }),
});

module.exports = {
  createRegionBody,
  updateRegionBody,
  regionIdParams,
  sameDayStatusQuery,
};

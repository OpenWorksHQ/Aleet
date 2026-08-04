/**
 * validators/addOnValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/addOnRoutes.js — the priced catalogue items customers can
 * attach to a booking.
 *
 * `addAddOn` does `AddOn.findOne({ name })` straight from the body, and `price`
 * is persisted as money, so both need to be scalars. `type` is already an enum
 * in models/AddOn.js — enforcing it here turns a Mongoose ValidationError 500
 * into a 400 with a readable message.
 * ---------------------------------------------------------------------------
 */

const { z, LIMITS, objectId, requiredString, optionalString, amount, enumOf } = require('./common');

const NAME_MAX = 120;
const REQUIRED_MESSAGE = 'Name, description, and type are required';

const ADD_ON_TYPES = ['free', 'paid'];

/**
 * POST /api/addons/add
 * `price` stays optional: the controller only requires it when `type` is
 * 'paid', and it owns that message ("Price is required for paid add-ons").
 */
const createAddOnBody = z.looseObject({
  name: requiredString('Name', { max: NAME_MAX, message: REQUIRED_MESSAGE }),
  description: requiredString('Description', {
    max: LIMITS.LONG_TEXT,
    message: REQUIRED_MESSAGE,
  }),
  type: enumOf('Type', ADD_ON_TYPES, { missingMessage: REQUIRED_MESSAGE }),
  price: amount('Price', { max: 100_000 }).optional().nullable(),
});

/** PUT /api/addons/update/:id — partial update, every field optional. */
const updateAddOnBody = z.looseObject({
  name: optionalString('Name', { max: NAME_MAX }),
  description: optionalString('Description', { max: LIMITS.LONG_TEXT }),
  type: enumOf('Type', ADD_ON_TYPES).optional(),
  price: amount('Price', { max: 100_000 }).optional().nullable(),
});

/** Any `/:id` add-on route. */
const addOnIdParams = z.object({
  id: objectId('Add-on ID', { message: 'Invalid add-on ID' }),
});

module.exports = {
  ADD_ON_TYPES,
  createAddOnBody,
  updateAddOnBody,
  addOnIdParams,
};

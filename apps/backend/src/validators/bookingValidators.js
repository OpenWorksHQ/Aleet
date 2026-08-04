/**
 * validators/bookingValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/bookingRoutes.js.
 *
 * The booking body is the widest surface in the app: it is forwarded whole to
 * `resolveBookingPartner(req.body)` and `buildItineraryFromBody(req.body)`, and
 * the wizard in apps/frontend sends a slightly different payload per booking
 * mode. So these schemas are LOOSE by design — every consumed key is typed,
 * unknown keys survive, and the semantic rules (ISO-UTC date shape, minimum
 * hours, advance-notice window, quantity range, stop/dropoff requirements) stay
 * in utils/bookingHelpers.js where their exact error messages already live.
 * Duplicating those ranges here would only change the wording clients see.
 *
 * What this layer actually buys:
 *   - `region`, `partnerId`, `venueId`, `status` … can no longer be
 *     `{ $ne: null }`, which would otherwise reach `Partner.findOne` /
 *     `Booking.find` directly.
 *   - `quantity`, `durationHours`, `tip`, `rating` can no longer be objects or
 *     arrays that slip past a bare `Number(...)` check.
 *   - Free-text fields (locations, notes, search) are length-capped.
 * ---------------------------------------------------------------------------
 */

const {
  z,
  LIMITS,
  optionalString,
  nullableString,
  objectId,
  numberLike,
  amount,
  booleanLike,
  objectIdArray,
  enumOf,
} = require('./common');

/** Longest ISO-8601 datetime worth accepting; the shape check is downstream. */
const DATETIME_MAX = 64;

const datetimeString = (label) => optionalString(label, { max: DATETIME_MAX }).nullable();

/**
 * One itinerary stop. `time` / `arrivalTime` / `pickupTime` are all accepted
 * because bookingHelpers reads whichever is present, and the frontend only
 * sends `time`.
 */
const stopSchema = z.looseObject({
  location: optionalString('Stop location', { max: LIMITS.ADDRESS }).nullable(),
  time: datetimeString('Stop time'),
  arrivalTime: datetimeString('Stop arrival time'),
  pickupTime: datetimeString('Stop pickup time'),
  timeType: enumOf('Stop timeType', ['arrival', 'pickup']).optional(),
  dwellMinutes: numberLike('dwellMinutes', {
    message: 'dwellMinutes must be a number if provided',
  })
    .optional()
    .nullable(),
  notes: nullableString('Stop notes', { max: LIMITS.LONG_TEXT }),
  addOnIds: objectIdArray('Stop addOnIds', { maxItems: 25 }).optional(),
});

/**
 * Fields shared by POST /preview and POST /start.
 *
 * `region` is NOT constrained to an ObjectId: the wizard falls back to
 * `data.region` (a plain region name) when `regionId` has not been resolved
 * yet, and today that produces a CastError the controller already turns into a
 * 400. Tightening it here would only change the message on a handled case.
 */
const bookingCoreFields = {
  region: optionalString('region', { max: LIMITS.SHORT_TEXT }).nullable(),
  state: optionalString('state', { max: LIMITS.SHORT_TEXT }).nullable(),
  startDate: datetimeString('startDate'),
  endDate: datetimeString('endDate'),
  vehicleTypeId: optionalString('vehicleTypeId', { max: LIMITS.ID }).nullable(),
  quantity: numberLike('quantity').optional().nullable(),
  bookingMode: optionalString('bookingMode', { max: 40 }),
  durationHours: numberLike('durationHours').optional().nullable(),
  duration: numberLike('duration').optional().nullable(),
  freeRouting: booleanLike('freeRouting').optional(),
  pickupLocation: nullableString('pickupLocation', { max: LIMITS.ADDRESS }),
  dropoffLocation: nullableString('dropoffLocation', { max: LIMITS.ADDRESS }),
  stops: z
    .array(stopSchema, { error: 'stops must be an array' })
    .max(50, { error: 'stops must contain at most 50 items' })
    .optional(),
  addOns: objectIdArray('addOns', { maxItems: 50 }).optional(),
  specialNotes: nullableString('specialNotes', { max: LIMITS.LONG_TEXT }),

  // Partner attribution — every one of these reaches a Mongo query in
  // services/partnerService.resolveBookingPartner().
  partnerId: optionalString('partnerId', { max: LIMITS.ID }).nullable(),
  venueId: optionalString('venueId', { max: LIMITS.ID }).nullable(),
  partnerCode: optionalString('partnerCode', { max: LIMITS.SHORT_TEXT }).nullable(),
  promoCode: optionalString('promoCode', { max: LIMITS.SHORT_TEXT }).nullable(),
};

/** POST /api/bookings/preview */
const previewBookingBody = z.looseObject(bookingCoreFields);

/** POST /api/bookings/start — same as preview plus the admin routing override. */
const startBookingBody = z.looseObject({
  ...bookingCoreFields,
  adminOverride: booleanLike('adminOverride').optional(),
});

/**
 * POST /api/bookings/confirm
 * `bookingId` reuses the controller's original wording so the 400 body is
 * byte-identical to what clients saw before.
 */
const confirmBookingBody = z.looseObject({
  bookingId: objectId('Booking ID', { message: 'Booking ID is required' }),
  driverId: objectId('driverId').optional().nullable(),
});

/** POST /api/bookings/accept */
const acceptBookingBody = z.looseObject({
  bookingId: objectId('Booking ID', { message: 'Booking ID and action are required' }),
  action: enumOf('action', ['accept', 'decline'], {
    message: 'Invalid action. Must be "accept" or "decline"',
    missingMessage: 'Booking ID and action are required',
  }),
});

/** POST /api/bookings/driver-cancel */
const driverCancelBookingBody = z.looseObject({
  bookingId: objectId('Booking ID', { message: 'Booking ID is required' }),
  reason: nullableString('reason', { max: LIMITS.LONG_TEXT }),
});

/**
 * PATCH /api/bookings/:id/complete
 * The 1–5 rating range stays in the controller ("Rating must be between 1 and
 * 5"); only the type is checked here. `tip`, by contrast, is money: a negative
 * value used to be silently swallowed, and is now rejected.
 */
const completeBookingBody = z.looseObject({
  bookingId: objectId('Booking ID').optional().nullable(),
  rating: numberLike('Rating').optional().nullable(),
  tip: amount('tip', { max: 100_000 }).optional().nullable(),
});

/** PATCH /api/bookings/:id/cancel */
const cancelBookingBody = z.looseObject({
  reason: nullableString('reason', { max: LIMITS.LONG_TEXT }),
});

/** Any `/:id` booking route — matches the controller's existing CastError text. */
const bookingIdParams = z.object({
  id: objectId('Booking ID', { message: 'Invalid booking ID' }),
});

/** Shared list-query fields — pagination and sorting are read by queryHelper. */
const listQueryFields = {
  page: numberLike('page').optional(),
  limit: numberLike('limit').optional(),
  sortBy: optionalString('sortBy', { max: 60 }),
  order: optionalString('order', { max: 10 }),
};

/**
 * GET /api/bookings (admin). `status`, `bookingMode` and `paymentStatus` are
 * copied straight into the Mongo filter, so they must be scalars.
 */
const adminBookingsQuery = z.looseObject({
  ...listQueryFields,
  search: optionalString('search', { max: LIMITS.SHORT_TEXT }),
  status: optionalString('status', { max: 40 }),
  bookingMode: optionalString('bookingMode', { max: 40 }),
  paymentStatus: optionalString('paymentStatus', { max: 40 }),
  timeWindow: optionalString('timeWindow', { max: 20 }),
});

/** GET /api/bookings/my */
const myBookingsQuery = z.looseObject({
  ...listQueryFields,
  status: optionalString('status', { max: 40 }),
  bookingMode: optionalString('bookingMode', { max: 40 }),
});

module.exports = {
  stopSchema,
  previewBookingBody,
  startBookingBody,
  confirmBookingBody,
  acceptBookingBody,
  driverCancelBookingBody,
  completeBookingBody,
  cancelBookingBody,
  bookingIdParams,
  adminBookingsQuery,
  myBookingsQuery,
  listQueryFields,
};

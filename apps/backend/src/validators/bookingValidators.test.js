const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('./bookingValidators');

const OID = '507f1f77bcf86cd799439011';
const OTHER_OID = '652f1f77bcf86cd7994390aa';

const firstMessage = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false, `expected ${JSON.stringify(value)} to be rejected`);
  return result.error.issues[0].message;
};

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(
    result.success,
    true,
    result.success ? '' : `unexpectedly rejected: ${result.error.issues[0].message}`,
  );
  return result.data;
};

/**
 * The exact multi_day payload apps/frontend/lib/api/bookings.ts builds.
 * If this ever stops parsing, the booking wizard is broken.
 */
const REAL_MULTI_DAY_BODY = {
  bookingMode: 'multi_day',
  region: OID,
  startDate: '2025-10-12T16:00:00.000Z',
  vehicleTypeId: OTHER_OID,
  quantity: 2,
  pickupLocation: '1 Main St, Sacramento, CA',
  dropoffLocation: '2 Second St, Sacramento, CA',
  addOns: [OID],
  specialNotes: 'Gate code 1234',
  partnerId: undefined,
  partnerCode: undefined,
  venueId: undefined,
  promoCode: undefined,
  endDate: '2025-10-12T20:00:00.000Z',
  freeRouting: false,
  stops: [
    { location: 'Stop A', time: '2025-10-12T17:00:00.000Z', notes: 'Ring bell' },
    { location: 'Stop B' },
  ],
};

/** The buy_hours variant, which sends `durationHours` + `state` instead of `endDate`. */
const REAL_BUY_HOURS_BODY = {
  bookingMode: 'buy_hours',
  region: OID,
  startDate: '2025-10-12T16:00:00.000Z',
  vehicleTypeId: OTHER_OID,
  quantity: 1,
  pickupLocation: '1 Main St',
  dropoffLocation: '2 Second St',
  addOns: [],
  durationHours: 4.5,
  state: 'California',
  stops: [],
  partnerCode: 'VENUE10',
  promoCode: 'VENUE10',
};

// ── preview / start: the real client payloads must keep working ─────────────

test('previewBookingBody accepts the multi_day payload the booking wizard sends', () => {
  parse(previewBookingBody, REAL_MULTI_DAY_BODY);
});

test('previewBookingBody accepts the buy_hours payload the booking wizard sends', () => {
  parse(previewBookingBody, REAL_BUY_HOURS_BODY);
});

test('startBookingBody accepts both real payloads plus adminOverride', () => {
  parse(startBookingBody, REAL_MULTI_DAY_BODY);
  parse(startBookingBody, REAL_BUY_HOURS_BODY);
  parse(startBookingBody, { ...REAL_MULTI_DAY_BODY, adminOverride: true });
});

test('booking bodies accept a completely empty object — semantic rules live in bookingHelpers', () => {
  parse(previewBookingBody, {});
  parse(startBookingBody, {});
});

test('booking bodies keep unknown keys so resolveBookingPartner still sees them', () => {
  const parsed = parse(startBookingBody, { ...REAL_MULTI_DAY_BODY, someFutureField: 'keep me' });
  assert.equal(parsed.someFutureField, 'keep me');
});

test('booking bodies tolerate the nulls JSON clients send for unset fields', () => {
  parse(startBookingBody, {
    region: null,
    dropoffLocation: null,
    specialNotes: null,
    startDate: null,
    quantity: null,
    durationHours: null,
    partnerId: null,
  });
});

test('numeric booking fields accept the string forms a form post produces', () => {
  parse(startBookingBody, { quantity: '3', durationHours: '4.5', duration: '4.5' });
});

// ── preview / start: hostile input ──────────────────────────────────────────

test('region cannot be a NoSQL operator object', () => {
  assert.equal(firstMessage(startBookingBody, { region: { $ne: null } }), 'region must be a string');
});

test('partner attribution fields cannot be operator objects — they hit Partner.findOne', () => {
  for (const field of ['partnerId', 'venueId', 'partnerCode', 'promoCode']) {
    assert.equal(
      firstMessage(startBookingBody, { [field]: { $ne: null } }),
      `${field} must be a string`,
      `${field} must reject operator objects`,
    );
  }
});

test('quantity cannot be an object that sneaks past Number()', () => {
  assert.equal(
    firstMessage(startBookingBody, { quantity: { $gt: 0 } }),
    'quantity must be a number',
  );
  assert.equal(firstMessage(startBookingBody, { quantity: [2] }), 'quantity must be a number');
});

test('addOns must be an array of real ObjectIds', () => {
  assert.equal(firstMessage(startBookingBody, { addOns: 'not-an-array' }), 'addOns must be an array');
  assert.equal(
    firstMessage(startBookingBody, { addOns: [{ $ne: null }] }),
    'Each addOns entry must be a valid ID',
  );
  assert.equal(
    firstMessage(startBookingBody, { addOns: ['../../etc/passwd'] }),
    'Each addOns entry must be a valid ID',
  );
});

test('free-text booking fields are length-capped', () => {
  assert.match(
    firstMessage(startBookingBody, { pickupLocation: 'x'.repeat(501) }),
    /pickupLocation must be at most 500 characters/,
  );
  assert.match(
    firstMessage(startBookingBody, { specialNotes: 'x'.repeat(2001) }),
    /specialNotes must be at most 2000 characters/,
  );
  assert.equal(startBookingBody.safeParse({ region: 'x'.repeat(100_000) }).success, false);
});

test('stops must be an array of objects and are count-capped', () => {
  assert.equal(firstMessage(startBookingBody, { stops: 'A,B' }), 'stops must be an array');
  assert.equal(
    firstMessage(startBookingBody, { stops: new Array(51).fill({ location: 'A' }) }),
    'stops must contain at most 50 items',
  );
});

test('a hostile value nested inside a stop is still caught', () => {
  assert.equal(
    firstMessage(startBookingBody, { stops: [{ location: { $ne: null } }] }),
    'Stop location must be a string',
  );
  assert.equal(
    firstMessage(startBookingBody, { stops: [{ location: 'A', dwellMinutes: { $gt: 0 } }] }),
    'dwellMinutes must be a number if provided',
  );
  assert.equal(
    firstMessage(startBookingBody, { stops: [{ location: 'A', addOnIds: ['nope'] }] }),
    'Each Stop addOnIds entry must be a valid ID',
  );
});

test('stop timeType is restricted to the two values the Booking model allows', () => {
  parse(startBookingBody, { stops: [{ location: 'A', timeType: 'pickup' }] });
  assert.equal(
    firstMessage(startBookingBody, { stops: [{ location: 'A', timeType: 'teleport' }] }),
    'Stop timeType must be "arrival" or "pickup"',
  );
});

test('freeRouting and adminOverride must be real booleans, not truthy strings', () => {
  parse(startBookingBody, { freeRouting: true, adminOverride: 'false' });
  assert.equal(
    firstMessage(startBookingBody, { freeRouting: 1 }),
    'freeRouting must be true or false',
  );
  assert.equal(
    firstMessage(startBookingBody, { adminOverride: 'yes' }),
    'adminOverride must be true or false',
  );
});

// ── confirm ─────────────────────────────────────────────────────────────────

test('confirmBookingBody keeps the controller wording for a missing bookingId', () => {
  assert.equal(firstMessage(confirmBookingBody, {}), 'Booking ID is required');
  assert.equal(firstMessage(confirmBookingBody, { bookingId: { $ne: null } }), 'Booking ID is required');
});

test('confirmBookingBody accepts an optional driverId and rejects a fake one', () => {
  parse(confirmBookingBody, { bookingId: OID });
  parse(confirmBookingBody, { bookingId: OID, driverId: OTHER_OID });
  parse(confirmBookingBody, { bookingId: OID, driverId: null });
  assert.equal(
    firstMessage(confirmBookingBody, { bookingId: OID, driverId: 'admin' }),
    'driverId must be a valid ID',
  );
});

// ── accept ──────────────────────────────────────────────────────────────────

test('acceptBookingBody accepts the driver-portal payload', () => {
  parse(acceptBookingBody, { bookingId: OID, action: 'accept' });
  parse(acceptBookingBody, { bookingId: OID, action: 'decline' });
});

test('acceptBookingBody reuses both original controller messages', () => {
  assert.equal(firstMessage(acceptBookingBody, {}), 'Booking ID and action are required');
  assert.equal(
    firstMessage(acceptBookingBody, { bookingId: OID }),
    'Booking ID and action are required',
  );
  assert.equal(
    firstMessage(acceptBookingBody, { bookingId: OID, action: 'steal' }),
    'Invalid action. Must be "accept" or "decline"',
  );
});

// ── driver-cancel / cancel ──────────────────────────────────────────────────

test('driverCancelBookingBody accepts the optional reason the driver portal sends', () => {
  parse(driverCancelBookingBody, { bookingId: OID });
  parse(driverCancelBookingBody, { bookingId: OID, reason: 'Vehicle broke down' });
  assert.equal(firstMessage(driverCancelBookingBody, { reason: 'x' }), 'Booking ID is required');
});

test('cancelBookingBody accepts an empty body and a null reason', () => {
  parse(cancelBookingBody, {});
  parse(cancelBookingBody, { reason: null });
  parse(cancelBookingBody, { reason: 'Plans changed' });
  assert.equal(firstMessage(cancelBookingBody, { reason: { $ne: null } }), 'reason must be a string');
});

// ── complete ────────────────────────────────────────────────────────────────

test('completeBookingBody accepts an empty body — rating and tip are optional', () => {
  parse(completeBookingBody, {});
  parse(completeBookingBody, { rating: 5, tip: 20 });
  parse(completeBookingBody, { rating: null, tip: null });
});

test('completeBookingBody leaves the 1-5 rating range to the controller but blocks non-numbers', () => {
  // 9 is out of range but passes here on purpose — bookingController owns
  // "Rating must be between 1 and 5" and that message must not change.
  parse(completeBookingBody, { rating: 9 });
  assert.equal(firstMessage(completeBookingBody, { rating: { $gt: 0 } }), 'Rating must be a number');
});

test('completeBookingBody rejects a negative tip instead of silently dropping it', () => {
  assert.equal(firstMessage(completeBookingBody, { tip: -50 }), 'tip must be at least 0');
  assert.equal(firstMessage(completeBookingBody, { tip: '-50' }), 'tip must be at least 0');
  assert.equal(firstMessage(completeBookingBody, { tip: 100001 }), 'tip must be at most 100000');
  assert.equal(firstMessage(completeBookingBody, { tip: { $gt: 0 } }), 'tip must be a number');
});

// ── params ──────────────────────────────────────────────────────────────────

test('bookingIdParams accepts a real id and rejects anything else', () => {
  parse(bookingIdParams, { id: OID });
  assert.equal(firstMessage(bookingIdParams, { id: 'my' }), 'Invalid booking ID');
  assert.equal(firstMessage(bookingIdParams, {}), 'Invalid booking ID');
  assert.equal(firstMessage(bookingIdParams, { id: `${OID}%00` }), 'Invalid booking ID');
});

// ── list queries ────────────────────────────────────────────────────────────

test('adminBookingsQuery accepts the filters the admin table sends', () => {
  parse(adminBookingsQuery, {
    page: '2',
    limit: '25',
    sortBy: 'createdAt',
    order: 'desc',
    search: 'Main St',
    status: 'Pending',
    bookingMode: 'multi_day',
    paymentStatus: 'Paid',
    timeWindow: 'future',
  });
  parse(adminBookingsQuery, {});
});

test('adminBookingsQuery filter fields cannot become Mongo operators', () => {
  for (const field of ['status', 'bookingMode', 'paymentStatus', 'timeWindow', 'search']) {
    assert.equal(
      firstMessage(adminBookingsQuery, { [field]: { $ne: 'Cancelled' } }),
      `${field} must be a string`,
    );
    assert.equal(
      firstMessage(adminBookingsQuery, { [field]: ['a', 'b'] }),
      `${field} must be a string`,
      `${field} must reject the array that a repeated query param produces`,
    );
  }
});

test('adminBookingsQuery caps the search term that reaches the regex builder', () => {
  assert.match(
    firstMessage(adminBookingsQuery, { search: 'a'.repeat(201) }),
    /search must be at most 200 characters/,
  );
});

test('pagination values must be numeric', () => {
  assert.equal(firstMessage(adminBookingsQuery, { page: ['1', '2'] }), 'page must be a number');
  assert.equal(firstMessage(myBookingsQuery, { limit: { $gt: 0 } }), 'limit must be a number');
});

test('myBookingsQuery accepts the driver/customer list filters', () => {
  parse(myBookingsQuery, { status: 'Confirmed', bookingMode: 'buy_hours', page: '1' });
  assert.equal(firstMessage(myBookingsQuery, { status: { $ne: null } }), 'status must be a string');
});

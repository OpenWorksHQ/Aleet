const test = require('node:test');
const assert = require('node:assert/strict');

const {
  toId,
  assertIsoUtc,
  validateBookingInput,
  validateFinalBookingInput,
  buildItineraryFromBody,
  splitLateNightHours,
  resolveMemberRate,
  calculateBookingPrice,
} = require('./bookingHelpers');

// Only the pure helpers are covered here. validateItinerary is excluded: it
// calls googleRoutesService.getDriveSeconds over the network.
//
// calculateBookingPrice IS covered, but only with empty add-on lists — that is
// the branch that never touches the AddOn collection, so no database is needed.

const isoIn = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

const SETTINGS = {
  bookingFee: 34,
  minBookingHours: 3,
  sameDayNoticeHours: 3,
  membershipMonthlyHours: 5,
  membershipRate: 89,
  founder30Rate: 69,
  lateNightStart: '00:00',
  lateNightEnd: '09:00',
};

const VEHICLE = { hourlyPrice: 120 };

const priceArgs = (overrides = {}) => ({
  vehicleType: VEHICLE,
  quantity: 1,
  addOns: [],
  stops: [],
  isSubscriber: false,
  memberRate: null,
  usedHours: 0,
  bookingHours: 4,
  settings: SETTINGS,
  ...overrides,
});

// ---------------------------------------------------------------------------
// toId
// ---------------------------------------------------------------------------

test('toId converts a valid 24-hex string to an ObjectId', () => {
  const id = toId('507f1f77bcf86cd799439011');
  assert.notEqual(id, null);
  assert.equal(String(id), '507f1f77bcf86cd799439011');
});

test('toId returns null instead of throwing on invalid input', () => {
  for (const input of ['nope', '', null, undefined, '507f1f77bcf86cd79943901', {}, []]) {
    assert.equal(toId(input), null, `expected null for ${JSON.stringify(input)}`);
  }
});

test('toId round-trips an ObjectId it produced', () => {
  const once = toId('507f1f77bcf86cd799439011');
  assert.equal(String(toId(once)), String(once));
});

// ---------------------------------------------------------------------------
// assertIsoUtc
// ---------------------------------------------------------------------------

test('assertIsoUtc accepts UTC ISO with, without, and with partial seconds', () => {
  assert.doesNotThrow(() => assertIsoUtc('startDate', '2025-10-12T16:00:00.000Z'));
  assert.doesNotThrow(() => assertIsoUtc('startDate', '2025-10-12T16:00:00Z'));
  assert.doesNotThrow(() => assertIsoUtc('startDate', '2025-10-12T16:00Z'));
  assert.doesNotThrow(() => assertIsoUtc('startDate', '2025-10-12T16:00:00.5Z'));
});

test('assertIsoUtc rejects offsets, local times and non-strings', () => {
  const bad = [
    '2025-10-12T16:00:00+00:00',
    '2025-10-12T16:00:00-05:00',
    '2025-10-12T16:00:00',
    '2025-10-12',
    '2025-10-12 16:00:00Z',
    5,
    null,
    undefined,
    new Date('2025-10-12T16:00:00.000Z'),
  ];
  for (const value of bad) {
    assert.throws(
      () => assertIsoUtc('startDate', value),
      /Invalid ISO datetime for startDate/,
      `expected rejection for ${JSON.stringify(value)}`,
    );
  }
});

test('assertIsoUtc names the offending field in its message', () => {
  assert.throws(() => assertIsoUtc('endDate', 'junk'), /Invalid ISO datetime for endDate/);
});

// ---------------------------------------------------------------------------
// splitLateNightHours — interpreted in US Eastern, not UTC
// ---------------------------------------------------------------------------

test('a trip entirely inside the Eastern late-night window is all late-night', () => {
  // 2025-06-10 00:00–09:00 EDT == 04:00Z–13:00Z
  assert.deepEqual(
    splitLateNightHours('2025-06-10T04:00:00.000Z', '2025-06-10T13:00:00.000Z'),
    { lateNightHours: 9, regularHours: 0, totalHours: 9 },
  );
});

test('a midday Eastern trip has no late-night hours', () => {
  // 2025-03-10 12:00–16:00 EDT == 16:00Z–20:00Z
  assert.deepEqual(
    splitLateNightHours('2025-03-10T16:00:00.000Z', '2025-03-10T20:00:00.000Z'),
    { lateNightHours: 0, regularHours: 4, totalHours: 4 },
  );
});

test('a trip straddling Eastern midnight is split at the window edge', () => {
  // 2025-03-09 21:00 EDT → 2025-03-10 01:00 EDT == 02:00Z–06:00Z on the 10th.
  assert.deepEqual(
    splitLateNightHours('2025-03-10T02:00:00.000Z', '2025-03-10T06:00:00.000Z'),
    { lateNightHours: 2, regularHours: 2, totalHours: 4 },
  );
});

test('the window is Eastern-local, so the same wall-clock trip splits identically in EST and EDT', () => {
  // Winter (UTC-5): 00:00–09:00 ET == 05:00Z–14:00Z
  const winter = splitLateNightHours('2025-01-15T05:00:00.000Z', '2025-01-15T14:00:00.000Z');
  // Summer (UTC-4): 00:00–09:00 ET == 04:00Z–13:00Z
  const summer = splitLateNightHours('2025-07-15T04:00:00.000Z', '2025-07-15T13:00:00.000Z');
  assert.deepEqual(winter, { lateNightHours: 9, regularHours: 0, totalHours: 9 });
  assert.deepEqual(summer, { lateNightHours: 9, regularHours: 0, totalHours: 9 });
});

test('the spring-forward night is 8 real hours, all of them late-night', () => {
  // 2025-03-09: Eastern 00:00 EST (05:00Z) → 09:00 EDT (13:00Z). The 2am hour
  // does not exist, so the elapsed time is 8h even though the clock shows 9.
  assert.deepEqual(
    splitLateNightHours('2025-03-09T05:00:00.000Z', '2025-03-09T13:00:00.000Z'),
    { lateNightHours: 8, regularHours: 0, totalHours: 8 },
  );
});

test('a multi-day trip accumulates the window on every calendar day it touches', () => {
  // 2025-03-11 18:00 ET → 2025-03-12 12:00 ET: 18 total hours, 9 of them in the
  // 12am–9am window on the 12th.
  assert.deepEqual(
    splitLateNightHours('2025-03-11T22:00:00.000Z', '2025-03-12T16:00:00.000Z'),
    { lateNightHours: 9, regularHours: 9, totalHours: 18 },
  );
});

test('a zero-length or reversed range yields all zeros', () => {
  const zero = { lateNightHours: 0, regularHours: 0, totalHours: 0 };
  assert.deepEqual(splitLateNightHours('2025-03-10T12:00:00.000Z', '2025-03-10T12:00:00.000Z'), zero);
  assert.deepEqual(splitLateNightHours('2025-03-10T20:00:00.000Z', '2025-03-10T16:00:00.000Z'), zero);
});

test('unparseable dates yield all zeros rather than NaN', () => {
  assert.deepEqual(
    splitLateNightHours('nope', 'also-nope'),
    { lateNightHours: 0, regularHours: 0, totalHours: 0 },
  );
});

test('splitLateNightHours accepts Date objects as well as ISO strings', () => {
  assert.deepEqual(
    splitLateNightHours(new Date('2025-06-10T04:00:00.000Z'), new Date('2025-06-10T13:00:00.000Z')),
    { lateNightHours: 9, regularHours: 0, totalHours: 9 },
  );
});

test('a malformed HH:MM window collapses to a zero-width window', () => {
  // parseHHMM returns 0 for junk, so start == end == midnight → nothing overlaps.
  assert.deepEqual(
    splitLateNightHours('2025-06-10T04:00:00.000Z', '2025-06-10T13:00:00.000Z', 'xx', null),
    { lateNightHours: 0, regularHours: 9, totalHours: 9 },
  );
});

test('a custom same-day window is honoured', () => {
  // Only 00:00–02:00 ET counts: of the 04:00Z–13:00Z trip, 2h qualify.
  assert.deepEqual(
    splitLateNightHours('2025-06-10T04:00:00.000Z', '2025-06-10T13:00:00.000Z', '00:00', '02:00'),
    { lateNightHours: 2, regularHours: 7, totalHours: 9 },
  );
});

test('a wrap-around window (22:00–02:00) is NOT supported and finds nothing', () => {
  // Documents a real limitation: the day-walk only handles start < end windows.
  assert.deepEqual(
    splitLateNightHours('2025-03-11T22:00:00.000Z', '2025-03-12T16:00:00.000Z', '22:00', '02:00'),
    { lateNightHours: 0, regularHours: 18, totalHours: 18 },
  );
});

// ---------------------------------------------------------------------------
// validateBookingInput
// ---------------------------------------------------------------------------

test('validateBookingInput returns the booking duration in hours and days', () => {
  const out = validateBookingInput({
    region: 'r1',
    startDate: isoIn(6),
    endDate: isoIn(10),
    quantity: 2,
    settings: SETTINGS,
  });
  assert.equal(Math.round(out.bookingHours), 4);
  assert.ok(Math.abs(out.bookingDays - 4 / 24) < 1e-9);
});

test('validateBookingInput requires ISO-UTC start and end dates', () => {
  assert.throws(
    () => validateBookingInput({ region: 'r1', startDate: 'soon', endDate: isoIn(10) }),
    /Invalid ISO datetime for startDate/,
  );
  assert.throws(
    () => validateBookingInput({ region: 'r1', startDate: isoIn(6), endDate: 'later' }),
    /Invalid ISO datetime for endDate/,
  );
});

test('validateBookingInput requires a region', () => {
  assert.throws(
    () => validateBookingInput({ region: null, startDate: isoIn(6), endDate: isoIn(10) }),
    /Region is required/,
  );
});

test('validateBookingInput rejects a start date in the past', () => {
  assert.throws(
    () => validateBookingInput({ region: 'r1', startDate: isoIn(-1), endDate: isoIn(10) }),
    /Start date must be in future/,
  );
});

test('validateBookingInput enforces the same-day notice window for non-members', () => {
  assert.throws(
    () => validateBookingInput({ region: 'r1', startDate: isoIn(1), endDate: isoIn(10), settings: SETTINGS }),
    /Earliest pickup is 3 hours from now/,
  );
});

test('the notice message pluralises against the configured value', () => {
  assert.throws(
    () => validateBookingInput({
      region: 'r1',
      startDate: isoIn(0.2),
      endDate: isoIn(10),
      settings: { ...SETTINGS, sameDayNoticeHours: 1 },
    }),
    /Earliest pickup is 1 hour from now/,
  );
});

test('members are exempt from the same-day notice rule', () => {
  assert.doesNotThrow(() =>
    validateBookingInput({
      region: 'r1',
      startDate: isoIn(1),
      endDate: isoIn(10),
      isSubscriber: true,
      settings: SETTINGS,
    }),
  );
});

test('skipSameDayNotice waives the notice rule and allows a near-now pickup', () => {
  assert.doesNotThrow(() =>
    validateBookingInput({
      region: 'r1',
      startDate: isoIn(0.01),
      endDate: isoIn(4),
      skipSameDayNotice: true,
      settings: SETTINGS,
    }),
  );
});

test('validateBookingInput caps non-member bookings at 7 days', () => {
  assert.throws(
    () => validateBookingInput({ region: 'r1', startDate: isoIn(6), endDate: isoIn(6 + 24 * 8), settings: SETTINGS }),
    /Maximum booking is 7 days/,
  );
  // Members are exempt.
  assert.doesNotThrow(() =>
    validateBookingInput({
      region: 'r1',
      startDate: isoIn(6),
      endDate: isoIn(6 + 24 * 8),
      isSubscriber: true,
      settings: SETTINGS,
    }),
  );
});

test('validateBookingInput accepts quantity 1-5 and rejects anything else', () => {
  for (const quantity of [1, 3, 5, '4', null, undefined]) {
    assert.doesNotThrow(
      () => validateBookingInput({ region: 'r1', startDate: isoIn(6), endDate: isoIn(10), quantity, settings: SETTINGS }),
      `expected quantity ${quantity} to be accepted`,
    );
  }
  for (const quantity of [0, 6, -1, 2.5, 'two']) {
    assert.throws(
      () => validateBookingInput({ region: 'r1', startDate: isoIn(6), endDate: isoIn(10), quantity, settings: SETTINGS }),
      /Quantity must be between 1 and 5/,
      `expected quantity ${quantity} to be rejected`,
    );
  }
});

test('buy_hours mode requires a positive durationHours', () => {
  for (const durationHours of [0, -2, 'abc', null, undefined]) {
    assert.throws(
      () => validateBookingInput({
        region: 'r1',
        startDate: isoIn(6),
        endDate: isoIn(10),
        bookingMode: 'buy_hours',
        durationHours,
        settings: SETTINGS,
      }),
      /Duration must be a positive number of hours/,
      `expected durationHours ${durationHours} to be rejected`,
    );
  }
  assert.doesNotThrow(() =>
    validateBookingInput({
      region: 'r1',
      startDate: isoIn(6),
      endDate: isoIn(10),
      bookingMode: 'buy_hours',
      durationHours: 4,
      settings: SETTINGS,
    }),
  );
});

test('a sub-minimum booking is NOT rejected — the minimum is billed, not blocked', () => {
  // Per the client spec, a guest may select 1 hour; calculateBookingPrice bills
  // the 3-hour minimum instead.
  assert.doesNotThrow(() =>
    validateBookingInput({ region: 'r1', startDate: isoIn(6), endDate: isoIn(7), settings: SETTINGS }),
  );
});

// ---------------------------------------------------------------------------
// validateFinalBookingInput
// ---------------------------------------------------------------------------

test('a pickup location is always required', () => {
  assert.throws(() => validateFinalBookingInput({}), /Pickup location is required/);
  assert.throws(
    () => validateFinalBookingInput({ bookingMode: 'buy_hours' }),
    /Pickup location is required/,
  );
});

test('multi_day requires a dropoff and at least one stop unless free routing is on', () => {
  assert.throws(
    () => validateFinalBookingInput({ pickupLocation: 'A' }),
    /Dropoff location is required/,
  );
  assert.throws(
    () => validateFinalBookingInput({ pickupLocation: 'A', dropoffLocation: 'B' }),
    /At least one stop is required if Free Routing is off/,
  );
  assert.throws(
    () => validateFinalBookingInput({ pickupLocation: 'A', dropoffLocation: 'B', stops: [] }),
    /At least one stop is required if Free Routing is off/,
  );
});

test('free routing waives the dropoff and stop requirements', () => {
  assert.doesNotThrow(() => validateFinalBookingInput({ pickupLocation: 'A', freeRouting: true }));
});

test('buy_hours needs only a pickup location', () => {
  assert.doesNotThrow(() => validateFinalBookingInput({ pickupLocation: 'A', bookingMode: 'buy_hours' }));
});

test('every stop must carry a location', () => {
  assert.throws(
    () => validateFinalBookingInput({ pickupLocation: 'A', dropoffLocation: 'B', stops: [{ dwellMinutes: 5 }] }),
    /Each stop must have a location/,
  );
  assert.throws(
    () => validateFinalBookingInput({ pickupLocation: 'A', bookingMode: 'buy_hours', stops: [{}] }),
    /Each stop must have a location/,
  );
});

test('a stop time, when present, must be ISO UTC — under any of its three aliases', () => {
  for (const key of ['time', 'arrivalTime', 'pickupTime']) {
    assert.throws(
      () => validateFinalBookingInput({
        pickupLocation: 'A',
        dropoffLocation: 'B',
        stops: [{ location: 'S', [key]: '2025-10-12 16:00' }],
      }),
      /Invalid ISO datetime for stop\.time \(S\)/,
      `expected ${key} to be validated`,
    );
  }
  assert.doesNotThrow(() =>
    validateFinalBookingInput({
      pickupLocation: 'A',
      dropoffLocation: 'B',
      stops: [{ location: 'S', time: '2025-10-12T16:00:00.000Z' }],
    }),
  );
});

test('a stop with no time at all is allowed', () => {
  assert.doesNotThrow(() =>
    validateFinalBookingInput({ pickupLocation: 'A', dropoffLocation: 'B', stops: [{ location: 'S' }] }),
  );
});

test('dwellMinutes must be numeric when supplied', () => {
  assert.throws(
    () => validateFinalBookingInput({
      pickupLocation: 'A',
      dropoffLocation: 'B',
      stops: [{ location: 'S', dwellMinutes: 'abc' }],
    }),
    /dwellMinutes must be a number if provided/,
  );
  assert.doesNotThrow(() =>
    validateFinalBookingInput({
      pickupLocation: 'A',
      dropoffLocation: 'B',
      stops: [{ location: 'S', dwellMinutes: '15' }],
    }),
  );
});

// ---------------------------------------------------------------------------
// buildItineraryFromBody
// ---------------------------------------------------------------------------

test('buildItineraryFromBody maps the three time aliases onto arrivalTime', () => {
  const itin = buildItineraryFromBody({
    pickupLocation: 'A',
    dropoffLocation: 'B',
    startDate: 'S',
    endDate: 'E',
    stops: [
      { location: 'S1', pickupTime: 't1' },
      { location: 'S2', arrivalTime: 't2' },
      { location: 'S3', time: 't3' },
    ],
  });
  assert.deepEqual(itin.stops.map((s) => s.arrivalTime), ['t1', 't2', 't3']);
  assert.equal(itin.pickupTime, 'S');
  assert.equal(itin.dropoffTime, 'E');
  assert.equal(itin.pickupLocation, 'A');
  assert.equal(itin.dropoffLocation, 'B');
});

test('timeType defaults to pickup only when the pickupTime alias was used', () => {
  const itin = buildItineraryFromBody({
    stops: [
      { location: 'S1', pickupTime: 't1' },  // → pickup
      { location: 'S2', arrivalTime: 't2' }, // → arrival
      { location: 'S3', time: 't3' },        // → arrival
    ],
  });
  assert.deepEqual(itin.stops.map((s) => s.timeType), ['pickup', 'arrival', 'arrival']);
});

test('an explicit valid timeType overrides the alias inference', () => {
  const itin = buildItineraryFromBody({
    stops: [
      { location: 'S1', pickupTime: 't1', timeType: 'arrival' },
      { location: 'S2', arrivalTime: 't2', timeType: 'pickup' },
      { location: 'S3', arrivalTime: 't3', timeType: 'garbage' }, // falls back
    ],
  });
  assert.deepEqual(itin.stops.map((s) => s.timeType), ['arrival', 'pickup', 'arrival']);
});

test('dwellMinutes is coerced to a number, defaulting to 0', () => {
  const itin = buildItineraryFromBody({
    stops: [
      { location: 'S1' },
      { location: 'S2', dwellMinutes: '10' },
      { location: 'S3', dwellMinutes: 7 },
    ],
  });
  assert.deepEqual(itin.stops.map((s) => s.dwellMinutes), [0, 10, 7]);
});

test('a body with no stops produces an empty stops array', () => {
  assert.deepEqual(buildItineraryFromBody({ pickupLocation: 'A' }).stops, []);
});

// ---------------------------------------------------------------------------
// resolveMemberRate
// ---------------------------------------------------------------------------

test('resolveMemberRate returns null for anyone who is not a subscriber', () => {
  assert.equal(resolveMemberRate(null, SETTINGS), null);
  assert.equal(resolveMemberRate({}, SETTINGS), null);
  assert.equal(resolveMemberRate({ subscriptionStatus: 'non-subscriber' }, SETTINGS), null);
});

test('resolveMemberRate returns the standard membership rate by default', () => {
  assert.equal(resolveMemberRate({ subscriptionStatus: 'subscriber' }, SETTINGS), 89);
  assert.equal(
    resolveMemberRate({ subscriptionStatus: 'subscriber' }, { membershipRate: 99, founder30Rate: 79 }),
    99,
  );
});

test('resolveMemberRate returns the Founder 30 rate for founder30 plans', () => {
  const founder = { subscriptionStatus: 'subscriber', subscriptionDetails: { plan: 'founder30' } };
  assert.equal(resolveMemberRate(founder, SETTINGS), 69);
  assert.equal(resolveMemberRate(founder, { membershipRate: 99, founder30Rate: 79 }), 79);
});

test('resolveMemberRate falls back to 89/69 when settings are missing or junk', () => {
  const member = { subscriptionStatus: 'subscriber' };
  const founder = { subscriptionStatus: 'subscriber', subscriptionDetails: { plan: 'founder30' } };
  for (const settings of [null, undefined, {}, { membershipRate: 0, founder30Rate: 0 }]) {
    assert.equal(resolveMemberRate(member, settings), 89);
    assert.equal(resolveMemberRate(founder, settings), 69);
  }
});

// ---------------------------------------------------------------------------
// calculateBookingPrice (no add-ons → no database access)
// ---------------------------------------------------------------------------

test('non-member price is hours * rate * qty + booking fee', async () => {
  const out = await calculateBookingPrice(priceArgs({ bookingHours: 4 }));
  assert.equal(out.regularPrice, 4 * 120 + 34);
  // Non-members get no discount, so both prices match.
  assert.equal(out.subscriberPrice, out.regularPrice);
  assert.equal(out.breakdown.billedHours, 4);
  assert.equal(out.breakdown.minimumHoursApplied, false);
  assert.equal(out.breakdown.minimumHoursNote, null);
  assert.equal(out.breakdown.memberRate, null);
});

test('quantity multiplies the hourly charge but not the booking fee', async () => {
  const out = await calculateBookingPrice(priceArgs({ quantity: 2, bookingHours: 4 }));
  assert.equal(out.regularPrice, 4 * 2 * 120 + 34);
  assert.equal(out.breakdown.qty, 2);
  assert.equal(out.breakdown.bookingFee, 34);
});

test('a non-member below the minimum is billed the minimum, not blocked', async () => {
  const out = await calculateBookingPrice(priceArgs({ bookingHours: 2 }));
  assert.equal(out.breakdown.hours, 2);
  assert.equal(out.breakdown.billedHours, 3);
  assert.equal(out.breakdown.minimumHoursApplied, true);
  assert.match(out.breakdown.minimumHoursNote, /below the 3h minimum/);
  assert.equal(out.regularPrice, 3 * 120 + 34);
});

test('members are exempt from the minimum-hours billing rule', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: 0,
    bookingHours: 1,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T17:00:00.000Z',
  }));
  assert.equal(out.breakdown.billedHours, 1);
  assert.equal(out.breakdown.minimumHoursApplied, false);
  assert.equal(out.subscriberPrice, 1 * 89 + 34);
});

test('included member hours cover a short daytime trip, leaving only the booking fee', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: 5,
    bookingHours: 4,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T20:00:00.000Z',
  }));
  assert.equal(out.subscriberPrice, 34);
  assert.equal(out.breakdown.freeHoursUsed, 4);
  assert.equal(out.breakdown.freeHoursLeft, 1);
  assert.equal(out.breakdown.billableHours, 0);
  assert.equal(out.breakdown.overageHours, 0);
  // The undiscounted price is still reported for comparison.
  assert.equal(out.regularPrice, 4 * 120 + 34);
});

test('member hours beyond the included allotment bill at the locked member rate', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: 5,
    bookingHours: 8,
    startDate: '2025-03-10T14:00:00.000Z',
    endDate: '2025-03-10T22:00:00.000Z',
  }));
  assert.equal(out.breakdown.freeHoursUsed, 5);
  assert.equal(out.breakdown.overageHours, 3);
  assert.equal(out.subscriberPrice, 3 * 89 + 34);
});

test('late-night member hours bill at the vehicle rate and consume no included hours', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: 5,
    bookingHours: 4,
    // 2025-03-10 01:00–05:00 EDT — entirely inside the 12am–9am window.
    startDate: '2025-03-10T05:00:00.000Z',
    endDate: '2025-03-10T09:00:00.000Z',
  }));
  assert.equal(out.breakdown.isLateNight, true);
  assert.equal(out.breakdown.lateNightHours, 4);
  assert.equal(out.breakdown.regularMemberHours, 0);
  assert.equal(out.breakdown.freeHoursUsed, 0);
  assert.equal(out.breakdown.freeHoursLeft, 5);
  assert.equal(out.subscriberPrice, 4 * 120 + 34);
  assert.match(out.breakdown.lateNightNote, /billed at the vehicle rate \(\$120\/hr\)/);
});

test('legacy usedHours is honoured when freeHoursLeft is not supplied', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    usedHours: 13, // of a 15-hour quarter → 2 left
    bookingHours: 4,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T20:00:00.000Z',
  }));
  assert.equal(out.breakdown.freeHoursUsed, 2);
  assert.equal(out.breakdown.overageHours, 2);
  assert.equal(out.subscriberPrice, 2 * 89 + 34);
});

test('an explicit freeHoursLeft of 0 overrides the legacy usedHours fallback', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    usedHours: 0,
    freeHoursLeft: 0,
    bookingHours: 4,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T20:00:00.000Z',
  }));
  assert.equal(out.breakdown.freeHoursUsed, 0);
  assert.equal(out.breakdown.overageHours, 4);
  assert.equal(out.subscriberPrice, 4 * 89 + 34);
});

test('a negative freeHoursLeft is clamped to zero', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: -10,
    bookingHours: 4,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T20:00:00.000Z',
  }));
  assert.equal(out.breakdown.overageHours, 4);
});

test('a member with no locked rate falls back to the vehicle rate', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: null,
    freeHoursLeft: 0,
    bookingHours: 4,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T20:00:00.000Z',
  }));
  assert.equal(out.breakdown.memberRate, 120);
  assert.equal(out.subscriberPrice, 4 * 120 + 34);
});

test('the booking fee falls back to settings, then to 34', async () => {
  const fromSettings = await calculateBookingPrice(priceArgs({ settings: { ...SETTINGS, bookingFee: 50 } }));
  assert.equal(fromSettings.breakdown.bookingFee, 50);

  const hardDefault = await calculateBookingPrice(priceArgs({ settings: undefined }));
  assert.equal(hardDefault.breakdown.bookingFee, 34);

  // An explicit numeric bookingFee argument wins over settings.
  const explicit = await calculateBookingPrice(priceArgs({ bookingFee: 0, settings: { ...SETTINGS, bookingFee: 50 } }));
  assert.equal(explicit.breakdown.bookingFee, 0);
  assert.equal(explicit.regularPrice, 4 * 120);
});

test('a missing vehicle type prices at zero rather than NaN', async () => {
  const out = await calculateBookingPrice(priceArgs({ vehicleType: null }));
  assert.equal(out.breakdown.baseRate, 0);
  assert.equal(out.regularPrice, 34);
});

test('member late-night split is skipped entirely when dates are not supplied', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: 5,
    bookingHours: 8,
    startDate: undefined,
    endDate: undefined,
  }));
  assert.equal(out.breakdown.isLateNight, false);
  assert.equal(out.breakdown.lateNightHours, 0);
  assert.equal(out.breakdown.regularMemberHours, 8);
  assert.equal(out.subscriberPrice, 3 * 89 + 34);
});

test('prices are rounded to two decimal places', async () => {
  const out = await calculateBookingPrice(priceArgs({ vehicleType: { hourlyPrice: 33.335 }, bookingHours: 3 }));
  // 3 * 33.335 = 100.005 → 134.005 raw, which must not leak extra precision.
  assert.equal(out.regularPrice, Number((3 * 33.335 + 34).toFixed(2)));
  const decimals = String(out.regularPrice).split('.')[1] || '';
  assert.ok(decimals.length <= 2, `expected at most 2 decimals, got ${out.regularPrice}`);
});

test('member fractional hour fields are rounded to four decimal places', async () => {
  const out = await calculateBookingPrice(priceArgs({
    isSubscriber: true,
    memberRate: 89,
    freeHoursLeft: 1 / 3,
    bookingHours: 4,
    startDate: '2025-03-10T16:00:00.000Z',
    endDate: '2025-03-10T20:00:00.000Z',
  }));
  assert.equal(out.breakdown.freeHoursUsed, 0.3333);
  assert.equal(out.breakdown.overageHours, 3.6667);
});

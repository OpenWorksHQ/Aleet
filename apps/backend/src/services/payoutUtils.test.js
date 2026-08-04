const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computePayoutCents,
  computePayoutBreakdown,
  TIER_PAYOUT_RATES,
} = require('./payoutUtils');
const {
  buildMembershipPayoutSnapshot,
  accountMembershipDriverObligation,
} = require('./membershipReservationService');

const settings = {
  bookingFee: 34,
  tiers: {
    'S-Level': {
      payoutRate: 0.30,
      keepsBookingFee: false,
      vehicleCostDeduction: 50,
      companyCostAbsorption: 100,
    },
    Pro: {
      payoutRate: 0.40,
      keepsBookingFee: true,
      vehicleCostDeduction: 0,
      companyCostAbsorption: 0,
    },
    Diamond: {
      payoutRate: 0.40,
      keepsBookingFee: true,
      vehicleCostDeduction: 0,
      companyCostAbsorption: 0,
    },
  },
};

const driver = (tier) => ({ driver: { tier } });

test('non-member payout remains fare percentage plus configured fee rules', () => {
  const booking = { finalPrice: 394, bookingFee: 34 };

  assert.equal(computePayoutCents(booking, driver('S-Level'), settings), 5800);
  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 17800);
});

test('fully prepaid Standard trip accounts for used hours without recharging member', () => {
  const booking = {
    finalPrice: 34,
    bookingFee: 34,
    membershipPayout: {
      prepaidHours: 5,
      lockedHourlyRate: 89,
      prepaidValue: 445,
      driverTier: 'Pro',
      payoutRate: 0.40,
      driverAmount: 178,
      accountedAt: new Date(),
    },
  };

  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 21200);

  const breakdown = computePayoutBreakdown(booking, driver('Pro'), settings);
  assert.equal(breakdown.customerTripCharge, 34);
  assert.equal(breakdown.prepaidMembershipValue, 445);
  assert.equal(breakdown.recognizedRevenue, 479);
  assert.equal(breakdown.membershipDriverObligation, 178);
  assert.equal(breakdown.driverPayout, 212);
});

test('partially prepaid trip combines paid fare and prepaid obligation once', () => {
  const booking = {
    // $270 late-night fare + $34 fee; 2.75 daytime hours came from membership.
    finalPrice: 304,
    bookingFee: 34,
    membershipPayout: {
      prepaidHours: 2.75,
      lockedHourlyRate: 89,
      prepaidValue: 244.75,
      driverTier: 'Diamond',
      payoutRate: 0.40,
      driverAmount: 97.90,
      accountedAt: new Date(),
    },
  };

  assert.equal(computePayoutCents(booking, driver('Diamond'), settings), 23990);
});

test('member overage and prepaid hours share the locked hourly payout basis', () => {
  const booking = {
    // Two $89 overage hours + $34 fee were paid during booking.
    finalPrice: 212,
    bookingFee: 34,
    membershipPayout: {
      prepaidHours: 5,
      lockedHourlyRate: 89,
      prepaidValue: 445,
      driverTier: 'Pro',
      payoutRate: 0.40,
      driverAmount: 178,
      accountedAt: new Date(),
    },
  };

  // 40% of all seven $89 hours ($249.20), plus the $34 booking fee.
  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 28320);
});

test('Founder 30 uses its own locked prepaid rate', () => {
  const booking = {
    finalPrice: 34,
    bookingFee: 34,
    membershipPayout: {
      prepaidHours: 5,
      lockedHourlyRate: 69,
      prepaidValue: 345,
      driverTier: 'Pro',
      payoutRate: 0.40,
      driverAmount: 138,
      accountedAt: new Date(),
    },
  };

  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 17200);
});

test('late-night member trip with no prepaid hours uses ordinary trip fare', () => {
  const booking = {
    finalPrice: 154,
    bookingFee: 34,
    membershipPayout: {
      prepaidHours: 0,
      lockedHourlyRate: 89,
      prepaidValue: 0,
    },
  };

  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 8200);
});

test('restored prepaid hours no longer contribute to payout', () => {
  const booking = {
    finalPrice: 34,
    bookingFee: 34,
    membershipPayout: {
      prepaidHours: 5,
      lockedHourlyRate: 89,
      prepaidValue: 445,
      driverAmount: 178,
      accountedAt: new Date(),
      reversedAt: new Date(),
    },
  };

  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 3400);
});

test('membership snapshot and driver obligation freeze locked values', () => {
  const snapshot = buildMembershipPayoutSnapshot({
    freeHoursUsed: 2.75,
    memberRate: 89,
  });
  assert.deepEqual(snapshot, {
    prepaidHours: 2.75,
    lockedHourlyRate: 89,
    prepaidValue: 244.75,
    driverAmount: 0,
  });

  const booking = { membershipPayout: { ...snapshot } };
  assert.equal(
    accountMembershipDriverObligation(booking, settings, driver('Pro')),
    true,
  );
  assert.equal(booking.membershipPayout.driverTier, 'Pro');
  assert.equal(booking.membershipPayout.payoutRate, 0.40);
  assert.equal(booking.membershipPayout.driverAmount, 97.90);
  assert.ok(booking.membershipPayout.accountedAt instanceof Date);
});

test('legacy membership bookings preserve their old payout basis', () => {
  const legacyBooking = {
    finalPrice: 34,
    bookingFee: 34,
    subscriptionPrice: 34,
  };

  assert.equal(
    computePayoutCents(legacyBooking, driver('Pro'), settings),
    3400,
  );
});

// ---------------------------------------------------------------------------
// Fallback behaviour when TierSettings is missing or incomplete.
// ---------------------------------------------------------------------------

test('the hardcoded tier table backs up a missing TierSettings document', () => {
  assert.deepEqual(TIER_PAYOUT_RATES, { Diamond: 0.40, Pro: 0.40, 'S-Level': 0.30 });

  const booking = { finalPrice: 394, bookingFee: 34 };
  // Pro: 40% of $360 + the $34 fee it keeps.
  assert.equal(computePayoutCents(booking, driver('Pro'), null), 17800);
  assert.equal(computePayoutCents(booking, driver('Diamond'), null), 17800);
  // S-Level: 30% of $360, and it does not keep the fee.
  assert.equal(computePayoutCents(booking, driver('S-Level'), null), 10800);
});

test('an unknown or absent driver tier defaults to S-Level economics', () => {
  const booking = { finalPrice: 394, bookingFee: 34 };
  assert.equal(computePayoutCents(booking, null, null), 10800);
  assert.equal(computePayoutCents(booking, {}, null), 10800);
  assert.equal(computePayoutCents(booking, { driver: {} }, null), 10800);

  // An unrecognised tier keeps the 0.30 rate but is not name-matched to
  // S-Level, so `keepsBookingFee` defaults to true: 30% of $360 + $34.
  assert.equal(computePayoutCents(booking, driver('Bronze'), null), 14200);
});

test('an empty tiers map falls through to the hardcoded rates', () => {
  const booking = { finalPrice: 394, bookingFee: 34 };
  assert.equal(computePayoutCents(booking, driver('Pro'), { tiers: {} }), 17800);
  assert.equal(computePayoutCents(booking, driver('Pro'), { bookingFee: 34 }), 17800);
});

// ---------------------------------------------------------------------------
// Booking fee resolution.
// ---------------------------------------------------------------------------

test('the stored booking fee wins, then settings, then the $34 default', () => {
  const d = driver('Pro');
  assert.equal(computePayoutBreakdown({ finalPrice: 394, bookingFee: 10 }, d, { bookingFee: 50 }).bookingFee, 10);
  assert.equal(computePayoutBreakdown({ finalPrice: 394 }, d, { bookingFee: 50 }).bookingFee, 50);
  assert.equal(computePayoutBreakdown({ finalPrice: 394 }, d, null).bookingFee, 34);
});

test('a zero stored booking fee is respected, not treated as missing', () => {
  const breakdown = computePayoutBreakdown({ finalPrice: 394, bookingFee: 0 }, driver('Pro'), { bookingFee: 50 });
  assert.equal(breakdown.bookingFee, 0);
  assert.equal(breakdown.tripFareCharge, 394);
});

test('a negative or non-numeric stored booking fee falls back to settings', () => {
  const d = driver('Pro');
  for (const bookingFee of [-5, 'abc', undefined, NaN, Infinity, {}]) {
    assert.equal(
      computePayoutBreakdown({ finalPrice: 394, bookingFee }, d, { bookingFee: 40 }).bookingFee,
      40,
      `expected fallback for bookingFee=${String(bookingFee)}`,
    );
  }
});

test('a null stored booking fee is read as an explicit $0, not as missing', () => {
  // Number(null) === 0, which is finite and non-negative, so it short-circuits
  // the settings fallback. Callers must write undefined, not null, to inherit.
  const breakdown = computePayoutBreakdown({ finalPrice: 394, bookingFee: null }, driver('Pro'), { bookingFee: 40 });
  assert.equal(breakdown.bookingFee, 0);
});

test('a negative settings booking fee is clamped to zero', () => {
  assert.equal(computePayoutBreakdown({ finalPrice: 394 }, driver('Pro'), { bookingFee: -20 }).bookingFee, 0);
});

// ---------------------------------------------------------------------------
// Guard rails.
// ---------------------------------------------------------------------------

test('a booking with no value at all pays nothing', () => {
  assert.equal(computePayoutCents({}, driver('Pro'), settings), 0);
  assert.equal(computePayoutCents({ finalPrice: 0 }, driver('Pro'), settings), 0);
  assert.equal(computePayoutCents(null, driver('Pro'), settings), 0);
  assert.equal(computePayoutCents({ finalPrice: -100 }, driver('Pro'), settings), 0);
});

test('a vehicle cost deduction larger than the earnings clamps the payout to zero', () => {
  // S-Level on a $40 trip: 30% of $6 = $1.80, minus the $50 vehicle cost.
  assert.equal(computePayoutCents({ finalPrice: 40, bookingFee: 34 }, driver('S-Level'), settings), 0);
  assert.equal(computePayoutBreakdown({ finalPrice: 40, bookingFee: 34 }, driver('S-Level'), settings).driverPayout, 0);
});

test('the fare percentage is applied to the fare only, never the booking fee', () => {
  const breakdown = computePayoutBreakdown({ finalPrice: 394, bookingFee: 34 }, driver('Pro'), settings);
  assert.equal(breakdown.tripFareCharge, 360);
  assert.equal(breakdown.earningsFromTripCharge, 144);
  assert.equal(breakdown.earningsFromFee, 34);
  assert.equal(breakdown.driverPayout, 178);
});

test('a final price below the booking fee never produces a negative fare base', () => {
  const breakdown = computePayoutBreakdown({ finalPrice: 10, bookingFee: 34 }, driver('Pro'), settings);
  assert.equal(breakdown.tripFareCharge, 0);
  assert.equal(breakdown.earningsFromTripCharge, 0);
});

// ---------------------------------------------------------------------------
// Membership obligation freezing.
// ---------------------------------------------------------------------------

test('before assignment the membership obligation is an estimate at the current rate', () => {
  // No accountedAt → 40% of the $445 prepaid value is estimated, not frozen.
  const booking = {
    finalPrice: 34,
    bookingFee: 34,
    membershipPayout: { prepaidValue: 445 },
  };
  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 21200);
  // The same booking estimated against an S-Level driver uses 30%.
  assert.equal(computePayoutCents(booking, driver('S-Level'), settings), 8350);
});

test('once accounted, the frozen driverAmount wins over the current tier rate', () => {
  const booking = {
    finalPrice: 34,
    bookingFee: 34,
    membershipPayout: { prepaidValue: 445, driverAmount: 100, accountedAt: new Date() },
  };
  // $100 frozen + $34 fee — NOT 40% of $445.
  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 13400);
});

test('a zero prepaid value contributes nothing regardless of accounting state', () => {
  const booking = {
    finalPrice: 154,
    bookingFee: 34,
    membershipPayout: { prepaidValue: 0, driverAmount: 999, accountedAt: new Date() },
  };
  assert.equal(computePayoutCents(booking, driver('Pro'), settings), 8200);
});

test('a reversed membership payout is excluded from recognized revenue too', () => {
  const breakdown = computePayoutBreakdown(
    {
      finalPrice: 34,
      bookingFee: 34,
      membershipPayout: { prepaidValue: 445, driverAmount: 178, accountedAt: new Date(), reversedAt: new Date() },
    },
    driver('Pro'),
    settings,
  );
  assert.equal(breakdown.prepaidMembershipValue, 0);
  assert.equal(breakdown.recognizedRevenue, 34);
  assert.equal(breakdown.membershipDriverObligation, 0);
  assert.equal(breakdown.driverPayout, 34);
});

// ---------------------------------------------------------------------------
// Company revenue.
// ---------------------------------------------------------------------------

test('company revenue is recognized revenue minus payout minus absorbed cost', () => {
  const breakdown = computePayoutBreakdown({ finalPrice: 394, bookingFee: 34 }, driver('S-Level'), settings);
  assert.equal(breakdown.recognizedRevenue, 394);
  assert.equal(breakdown.driverPayout, 58);      // 30% of $360 - $50 vehicle cost
  assert.equal(breakdown.companyCostAbsorption, 100);
  assert.equal(breakdown.companyRevenue, 236);   // 394 - 58 - 100
});

test('companyCostAbsorption is a company expense and never reduces the driver payout', () => {
  const withAbsorption = computePayoutBreakdown(
    { finalPrice: 394, bookingFee: 34 },
    driver('Pro'),
    { ...settings, tiers: { ...settings.tiers, Pro: { ...settings.tiers.Pro, companyCostAbsorption: 250 } } },
  );
  const without = computePayoutBreakdown({ finalPrice: 394, bookingFee: 34 }, driver('Pro'), settings);

  assert.equal(withAbsorption.driverPayout, without.driverPayout);
  assert.equal(withAbsorption.companyRevenue, without.companyRevenue - 250);
});

test('recognized revenue counts the prepaid membership value on top of the cash charge', () => {
  const breakdown = computePayoutBreakdown(
    {
      finalPrice: 212,
      bookingFee: 34,
      membershipPayout: { prepaidValue: 445, driverAmount: 178, accountedAt: new Date() },
    },
    driver('Pro'),
    settings,
  );
  assert.equal(breakdown.customerTripCharge, 212);
  assert.equal(breakdown.prepaidMembershipValue, 445);
  assert.equal(breakdown.recognizedRevenue, 657);
  assert.equal(breakdown.driverPayout, 283.20);
  assert.equal(breakdown.companyRevenue, 373.80);
});

test('computePayoutCents and computePayoutBreakdown never disagree', () => {
  const bookings = [
    { finalPrice: 394, bookingFee: 34 },
    { finalPrice: 10, bookingFee: 34 },
    { finalPrice: 212, bookingFee: 34, membershipPayout: { prepaidValue: 445, driverAmount: 178, accountedAt: new Date() } },
    { finalPrice: 34, bookingFee: 34, membershipPayout: { prepaidValue: 445 } },
    { finalPrice: 40, bookingFee: 34 },
  ];
  for (const booking of bookings) {
    for (const tier of ['S-Level', 'Pro', 'Diamond']) {
      assert.equal(
        computePayoutCents(booking, driver(tier), settings),
        Math.round(computePayoutBreakdown(booking, driver(tier), settings).driverPayout * 100),
        `mismatch for ${tier} on ${JSON.stringify(booking)}`,
      );
    }
  }
});

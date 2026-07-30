const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computePayoutCents,
  computePayoutBreakdown,
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

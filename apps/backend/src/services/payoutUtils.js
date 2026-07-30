// services/payoutUtils.js

const TIER_PAYOUT_RATES = {
  'Diamond': 0.40,
  'Pro': 0.40,
  'S-Level': 0.30
};

function getMembershipPayoutValue(booking) {
  if (booking?.membershipPayout?.reversedAt) return 0;
  return Math.max(0, Number(booking?.membershipPayout?.prepaidValue) || 0);
}

function getMembershipDriverAmount(booking, payoutRate) {
  const prepaidValue = getMembershipPayoutValue(booking);
  if (prepaidValue <= 0) return 0;

  // Once a driver commits, the obligation is frozen against that driver's
  // tier. Before assignment, use the supplied driver's rate as an estimate.
  const accountedAmount = Number(booking?.membershipPayout?.driverAmount);
  if (booking?.membershipPayout?.accountedAt && accountedAmount >= 0) {
    return accountedAmount;
  }

  return prepaidValue * payoutRate;
}

function resolveBookingFee(booking, settings) {
  const storedFee = Number(booking?.bookingFee);
  if (Number.isFinite(storedFee) && storedFee >= 0) return storedFee;
  return Math.max(0, Number(settings?.bookingFee) || 34);
}

/**
 * Computes what a driver actually earns for a completed booking, in cents.
 *
 * Formula (all admin-adjustable via TierSettings.tiers[tier]):
 *   earnings = (tripCharge * payoutRate)
 *            + prepaidMembershipDriverObligation
 *            + (bookingFee, only if tier.keepsBookingFee)
 *            - (vehicleCostDeduction, per-trip cost charged TO the driver, e.g. S-Level -$50)
 *
 * `companyCostAbsorption` (e.g. Company Vehicle Cost -$100 for S-Level) is NOT deducted from
 * the driver's payout — it's a cost the company itself absorbs. It only affects the company
 * revenue report (see services/companyRevenueService.js), not what the driver receives.
 */
const computePayoutCents = (booking, driver = null, settings = null) => {
  const finalPrice = Math.max(0, Number(booking?.finalPrice) || 0);
  const prepaidValue = getMembershipPayoutValue(booking);
  if (finalPrice <= 0 && prepaidValue <= 0) return 0;

  const tier = driver?.driver?.tier || 'S-Level';
  const tierCfg = settings?.tiers?.[tier];

  const payoutRate = tierCfg?.payoutRate ?? TIER_PAYOUT_RATES[tier] ?? 0.30;
  const keepsBookingFee = tierCfg?.keepsBookingFee ?? (tier !== 'S-Level');
  const bookingFee = resolveBookingFee(booking, settings);
  const vehicleCostDeduction = Number(tierCfg?.vehicleCostDeduction) || 0;

  // finalPrice includes the booking fee. Remove it before applying the tier
  // percentage, then award the full fee only to tiers configured to keep it.
  const tripFareCharge = Math.max(0, finalPrice - bookingFee);
  const earningsFromFare = tripFareCharge * payoutRate;
  const membershipDriverAmount = getMembershipDriverAmount(booking, payoutRate);
  const earningsFromFee = keepsBookingFee ? bookingFee : 0;

  const netDollars =
    earningsFromFare +
    membershipDriverAmount +
    earningsFromFee -
    vehicleCostDeduction;

  return Math.max(0, Math.round(netDollars * 100));
};

/**
 * Breaks down the full payout math for a single booking — used by admin-facing
 * reports (driver payout detail, company revenue) where every line item needs
 * to be shown, not just the final payout number.
 */
const computePayoutBreakdown = (booking, driver = null, settings = null) => {
  const tier = driver?.driver?.tier || 'S-Level';
  const tierCfg = settings?.tiers?.[tier];

  const payoutRate = tierCfg?.payoutRate ?? TIER_PAYOUT_RATES[tier] ?? 0.30;
  const keepsBookingFee = tierCfg?.keepsBookingFee ?? (tier !== 'S-Level');
  const bookingFee = resolveBookingFee(booking, settings);
  const vehicleCostDeduction = Number(tierCfg?.vehicleCostDeduction) || 0;
  const companyCostAbsorption = Number(tierCfg?.companyCostAbsorption) || 0;

  const finalPrice = Number(booking?.finalPrice) || 0;
  const prepaidMembershipValue = getMembershipPayoutValue(booking);
  const recognizedRevenue = Number(
    (finalPrice + prepaidMembershipValue).toFixed(2),
  );
  const tripFareCharge = Math.max(0, finalPrice - bookingFee);
  const earningsFromTripCharge = Number((tripFareCharge * payoutRate).toFixed(2));
  const membershipDriverObligation = Number(
    getMembershipDriverAmount(booking, payoutRate).toFixed(2),
  );
  const earningsFromFare = Number(
    (earningsFromTripCharge + membershipDriverObligation).toFixed(2),
  );
  const earningsFromFee = keepsBookingFee ? bookingFee : 0;
  const driverPayout = Math.max(0, Number((earningsFromFare + earningsFromFee - vehicleCostDeduction).toFixed(2)));

  // Company revenue on this trip = total charged to guest, minus what the driver was paid,
  // minus any additional internal cost the company absorbs for this tier (e.g. vehicle
  // maintenance/lease cost the company eats rather than passing to the driver).
  const companyRevenue = Number((recognizedRevenue - driverPayout - companyCostAbsorption).toFixed(2));

  return {
    tier,
    finalPrice,
    customerTripCharge: finalPrice,
    tripFareCharge,
    prepaidMembershipValue,
    recognizedRevenue,
    payoutRate,
    keepsBookingFee,
    bookingFee,
    earningsFromTripCharge,
    membershipDriverObligation,
    earningsFromFare,
    earningsFromFee,
    vehicleCostDeduction,
    companyCostAbsorption,
    driverPayout,
    companyRevenue
  };
};

module.exports = { computePayoutCents, computePayoutBreakdown, TIER_PAYOUT_RATES };

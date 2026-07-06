// services/payoutUtils.js

const TIER_PAYOUT_RATES = {
  'Diamond': 0.40,
  'Pro': 0.40,
  'S-Level': 0.30
};

/**
 * Computes what a driver actually earns for a completed booking, in cents.
 *
 * Formula (all admin-adjustable via TierSettings.tiers[tier]):
 *   earnings = (finalPrice * payoutRate)
 *            + (bookingFee, only if tier.keepsBookingFee)
 *            - (vehicleCostDeduction, per-trip cost charged TO the driver, e.g. S-Level -$50)
 *
 * `companyCostAbsorption` (e.g. Company Vehicle Cost -$100 for S-Level) is NOT deducted from
 * the driver's payout — it's a cost the company itself absorbs. It only affects the company
 * revenue report (see services/companyRevenueService.js), not what the driver receives.
 */
const computePayoutCents = (booking, driver = null, settings = null) => {
  if (!booking?.finalPrice) return 0;

  const tier = driver?.driver?.tier || 'S-Level';
  const tierCfg = settings?.tiers?.[tier];

  const payoutRate = tierCfg?.payoutRate ?? TIER_PAYOUT_RATES[tier] ?? 0.30;
  const keepsBookingFee = tierCfg?.keepsBookingFee ?? (tier !== 'S-Level');
  const bookingFee = Number(booking.bookingFee) || settings?.bookingFee || 34;
  const vehicleCostDeduction = Number(tierCfg?.vehicleCostDeduction) || 0;

  const earningsFromFare = booking.finalPrice * payoutRate;
  const earningsFromFee = keepsBookingFee ? bookingFee : 0;

  const netDollars = earningsFromFare + earningsFromFee - vehicleCostDeduction;

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
  const bookingFee = Number(booking?.bookingFee) || settings?.bookingFee || 34;
  const vehicleCostDeduction = Number(tierCfg?.vehicleCostDeduction) || 0;
  const companyCostAbsorption = Number(tierCfg?.companyCostAbsorption) || 0;

  const finalPrice = Number(booking?.finalPrice) || 0;
  const earningsFromFare = Number((finalPrice * payoutRate).toFixed(2));
  const earningsFromFee = keepsBookingFee ? bookingFee : 0;
  const driverPayout = Math.max(0, Number((earningsFromFare + earningsFromFee - vehicleCostDeduction).toFixed(2)));

  // Company revenue on this trip = total charged to guest, minus what the driver was paid,
  // minus any additional internal cost the company absorbs for this tier (e.g. vehicle
  // maintenance/lease cost the company eats rather than passing to the driver).
  const companyRevenue = Number((finalPrice - driverPayout - companyCostAbsorption).toFixed(2));

  return {
    tier,
    finalPrice,
    payoutRate,
    keepsBookingFee,
    bookingFee,
    earningsFromFare,
    earningsFromFee,
    vehicleCostDeduction,
    companyCostAbsorption,
    driverPayout,
    companyRevenue
  };
};

module.exports = { computePayoutCents, computePayoutBreakdown, TIER_PAYOUT_RATES };

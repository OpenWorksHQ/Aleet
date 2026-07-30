require('dotenv').config();
const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const Booking = require('../models/Booking');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const TierSettings = require('../models/TierSettings');
const { computePayoutCents: computeTierPayoutCents } = require('../services/payoutUtils');

const CURRENCY = 'usd'
const MODE = 'BUSINESS';

// --- helpers ---
const toCents = (num) => Math.max(0, Math.round((Number(num) || 0) * 100));

/**
 * Public calculator used by the endpoints.
 *
 * Delegates to services/payoutUtils.js — the SAME
 * tier-based (S-Level/Pro/Diamond) calculation used everywhere else in the app
 * (bookingController, dashboardController). This ensures a driver's payout is
 * identical no matter which endpoint triggered it, and respects admin-configured
 * TierSettings (payoutRate, keepsBookingFee, vehicleCostDeduction) instead of a
 * hard-coded 30/40% split. Tip is always paid 100% to the driver on top.
 */
async function computePayoutCents(booking) {
  const [driver, settings] = await Promise.all([
    booking.assignedDriver
      ? User.findById(booking.assignedDriver).select('driver.tier').lean()
      : null,
    TierSettings.findOne().lean()
  ]);

  const tipCents = toCents(booking.tip);
  return computeTierPayoutCents(booking, driver, settings) + tipCents;
}

// --- validations for eligibility ---
function assertEligibleForPayout(booking) {
  if (!booking) throw new Error('Booking not found.');
  if (!booking.assignedDriver) throw new Error('No driver assigned to this booking.');
  if (booking.PaidToDriver) throw new Error('Booking already paid to driver.');
  if (booking.status !== 'Completed') {
    throw new Error(`Booking status must be 'Completed'; got '${booking.status}'.`);
  }
  if (!['Paid'].includes(booking.paymentStatus)) {
    throw new Error(`Booking paymentStatus must be 'Paid'; got '${booking.paymentStatus}'.`);
  }
  if (!booking.finalPrice || Number(booking.finalPrice) <= 0) {
    throw new Error('Invalid finalPrice; cannot payout.');
  }
}

/**
 * Atomically claim a booking before moving money so two concurrent requests
 * can't both transfer. Returns null when another request already claimed it.
 */
async function claimBookingForPayout(bookingId) {
  return Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: 'Completed',
      PaidToDriver: false,
      paymentStatus: 'Paid',
    },
    { $set: { PaidToDriver: true, paidToDriverAt: new Date() } },
    { new: true },
  ).lean();
}

/** Release a claim when the Stripe transfer fails, so it can be retried. */
async function releaseBookingClaim(bookingId) {
  await Booking.updateOne(
    { _id: bookingId },
    { $set: { PaidToDriver: false, paidToDriverAt: null } },
  );
}

/** Record the Stripe transfer result on the booking for audit/reconciliation. */
async function recordTransferOnBooking(bookingId, transfer, amountCents) {
  await Booking.updateOne(
    { _id: bookingId },
    { $set: { payoutTransferId: transfer.id, payoutAmountCents: amountCents } },
  );
  await Booking.updateOne(
    { _id: bookingId, 'membershipPayout.prepaidValue': { $gt: 0 } },
    { $set: { 'membershipPayout.releasedAt': new Date() } },
  );
}

// --- STRIPE transfer ---
async function createTransfer({ amountCents, destinationAccount, transferGroup }) {
  if (amountCents <= 0) throw new Error('Payout amount must be > 0 cents.');
  return stripe.transfers.create(
    {
      amount: amountCents,
      currency: CURRENCY,
      destination: destinationAccount,
      transfer_group: transferGroup,
    },
    {
      // defensive idempotency (transfer_group + amount)
      idempotencyKey: `${transferGroup}:${amountCents}`,
    }
  );
}

// --- Single booking payout ---
const payoutSingleBooking = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;

  const booking = await Booking.findById(bookingId).lean();
  assertEligibleForPayout(booking);

  // A driver may only release their own trip; admins may release any.
  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin && String(booking.assignedDriver) !== String(req.user?.id)) {
    return res.status(403).json({ ok: false, error: 'This trip is not assigned to you.' });
  }

  const bank = await BankAccount.findOne({ driverId: booking.assignedDriver }).lean();
  if (!bank || !bank.stripeAccountId) {
    throw new Error('Driver is not connected to Stripe (no stripeAccountId).');
  }

  const amountCents = await computePayoutCents(booking);
  if (amountCents <= 0) throw new Error('Computed payout is zero; skip.');

  // Claim first so a duplicate request cannot transfer twice.
  const claimed = await claimBookingForPayout(booking._id);
  if (!claimed) throw new Error('Booking already paid to driver.');

  const transferGroup = `booking:${booking._id.toString()}`;

  let transfer;
  try {
    transfer = await createTransfer({
      amountCents,
      destinationAccount: bank.stripeAccountId,
      transferGroup,
    });
  } catch (err) {
    await releaseBookingClaim(booking._id);
    throw err;
  }

  await recordTransferOnBooking(booking._id, transfer, amountCents);

  res.status(200).json({
    ok: true,
    mode: MODE,
    bookingId: booking._id,
    amountCents,
    currency: CURRENCY,
    transferId: transfer.id,
  });
});

// --- Bulk payout for all eligible bookings ---
const payoutEligibleBookings = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  // Eligible = Completed trip, customer Paid, not yet PaidToDriver, driver assigned.
  // `status: 'Completed'` belongs here: previously it only guarded the post-transfer
  // update, so a non-completed trip was transferred and never flagged — which paid
  // the driver again on the next run once Stripe's idempotency key expired.
  const eligible = await Booking.find({
    status: 'Completed',
    paymentStatus: 'Paid',
    PaidToDriver: false,
    assignedDriver: { $ne: null },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  const results = [];
  for (const b of eligible) {
    try {
      const bank = await BankAccount.findOne({ driverId: b.assignedDriver }).lean();
      if (!bank?.stripeAccountId) {
        results.push({ bookingId: b._id, ok: false, error: 'Driver missing stripeAccountId' });
        continue;
      }

      const amountCents = await computePayoutCents(b);
      if (amountCents <= 0) {
        results.push({ bookingId: b._id, ok: false, error: 'Zero payout' });
        continue;
      }

      const claimed = await claimBookingForPayout(b._id);
      if (!claimed) {
        results.push({ bookingId: b._id, ok: false, error: 'Already paid to driver' });
        continue;
      }

      const transferGroup = `booking:${b._id.toString()}`;
      let transfer;
      try {
        transfer = await createTransfer({
          amountCents,
          destinationAccount: bank.stripeAccountId,
          transferGroup,
        });
      } catch (err) {
        await releaseBookingClaim(b._id);
        throw err;
      }

      await recordTransferOnBooking(b._id, transfer, amountCents);

      results.push({
        bookingId: b._id,
        ok: true,
        amountCents,
        currency: CURRENCY,
        transferId: transfer.id,
      });
    } catch (e) {
      results.push({ bookingId: b._id, ok: false, error: e.message });
    }
  }

  res.status(200).json({
    ok: true,
    mode: MODE,
    processed: results.length,
    results,
  });
});



const payoutToAccount = asyncHandler(async (req, res) => {
  const { accountId, amount } = req.body;

  if (!accountId) {
    throw new Error('stripeAccountId is required.');
  }
  if (!amount || Number(amount) <= 0) {
    throw new Error('Valid amount (in dollars) is required.');
  }

  // convert dollars to cents
  const amountCents = Math.round(Number(amount) * 100);

  // ✅ 1. Make sure transfers capability is requested/enabled
  const account = await stripe.accounts.retrieve(accountId);

  if (
    !account.capabilities?.transfers ||
    account.capabilities.transfers !== 'active'
  ) {
    await stripe.accounts.update(accountId, {
      capabilities: { transfers: { requested: true } },
    });
  }

  // ✅ 2. Now create transfer
  const transferGroup = `manual:${Date.now()}`;

  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: CURRENCY, // e.g. 'usd'
    destination: accountId,
    transfer_group: transferGroup,
  });

  res.status(200).json({
    ok: true,
    accountId,
    amountCents,
    currency: CURRENCY,
    transferId: transfer.id,
  });
});




module.exports = {
  payoutSingleBooking,
  payoutEligibleBookings,
  payoutToAccount
};

/**
 * cron/staleBookingCancelJob.js
 * ---------------------------------------------------------------------------
 * Auto-cancel bookings that never started / never got a driver after the
 * scheduled window has passed. Prevents trip history from filling with
 * orphaned Pending (and forgotten Confirmed) trips.
 *
 * Rules:
 *   - Pending + endDate < now  → Cancelled  (no driver / never started)
 *   - Confirmed + endDate < now → Cancelled  (assigned but never completed)
 *
 * Completed / Cancelled / Expired bookings are left alone.
 * ---------------------------------------------------------------------------
 */

const Booking = require('../models/Booking');
const { restoreMembershipHours } = require('../services/membershipReservationService');

async function runStaleBookingCancelSweep() {
  const now = new Date();

  const bookings = await Booking.find({
    status: { $in: ['Pending', 'Confirmed'] },
    'dates.endDate': { $lt: now },
  });

  let modified = 0;
  for (const booking of bookings) {
    await restoreMembershipHours(
      booking,
      'Auto-cancelled because trip never started',
    );
    booking.status = 'Cancelled';
    booking.cancellation.cancelledAt = now;
    booking.cancellation.reason =
      'Auto-cancelled: scheduled window passed without trip start';
    await booking.save();
    modified += 1;
  }
  if (modified > 0) {
    console.log(`[staleBookingCancel] Auto-cancelled ${modified} past booking(s)`);
  }

  return { modified };
}

module.exports = { runStaleBookingCancelSweep };

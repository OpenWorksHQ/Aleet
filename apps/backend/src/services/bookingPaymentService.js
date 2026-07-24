const Booking = require('../models/Booking');
const User = require('../models/User');
const { autoDispatchBooking } = require('./dispatchService');
const { sendTripAlert } = require('./twilioService');
const { recordPartnerBookingStarted } = require('./partnerService');

function formatTripTime(date) {
  if (!date) return 'the scheduled time';
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Single source of truth after successful booking payment.
 * Marks Paid and releases the trip to admin/drivers exactly once.
 */
async function markBookingPaidAndDispatch({
  bookingId,
  paymentIntentId,
  tip,
}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (booking.status === 'Cancelled') throw new Error('Booking is cancelled');

  if (booking.paymentStatus !== 'Paid') {
    booking.paymentStatus = 'Paid';
    booking.paidAt = new Date();
    if (paymentIntentId) booking.stripePaymentIntentId = paymentIntentId;
    if (tip !== undefined) booking.tip = Math.max(0, Number(tip || 0));
    await booking.save();
  }

  // Atomic release lock prevents webhook/client reconciliation from dispatching twice.
  const release = await Booking.findOneAndUpdate(
    { _id: bookingId, dispatchedAt: null, paymentStatus: 'Paid', status: 'Pending' },
    { $set: { dispatchedAt: new Date() } },
    { new: true },
  );

  if (!release) return Booking.findById(bookingId);

  try {
    if (release.partner?.partner) {
      await recordPartnerBookingStarted(release.partner.partner);
    }

    const { drivers } = await autoDispatchBooking(release);
    const when = formatTripTime(release.dates?.startDate);

    const guest = await User.findById(release.user);
    if (guest) {
      sendTripAlert(guest, 'guest_booking_received', { when })
        .catch((e) => console.error('Paid booking guest SMS failed:', e?.message));
    }

    for (const driver of drivers || []) {
      sendTripAlert(driver, 'driver_trip_offer', {
        when,
        pickup: release.pickupLocation,
      }).catch((e) => console.error('Paid booking driver SMS failed:', e?.message));
    }
  } catch (err) {
    // Unlock so a payment reconciliation call can safely retry dispatch.
    await Booking.updateOne(
      { _id: bookingId, status: 'Pending' },
      { $set: { dispatchedAt: null } },
    );
    throw err;
  }

  return Booking.findById(bookingId);
}

module.exports = { markBookingPaidAndDispatch };

const MonthlyHours = require('../models/MonthlyHours');
const { getMembershipHourBalance, yearMonthKey } = require('../utils/membershipHours');

/**
 * Reserve membership usage exactly once when a driver commits to a trip.
 * Overage is already included in booking.finalPrice and paid before dispatch,
 * so this service never charges the card again.
 */
async function reserveMembershipHours(booking, settings) {
  const existing = booking.membershipHoursReservation;
  if (existing?.reservedAt && !existing?.restoredAt) {
    return {
      reserved: false,
      hours: Number(existing.hours || 0),
      overageHours: 0,
    };
  }

  const hours = Number(booking.durationHours || 0);
  if (hours <= 0) return { reserved: false, hours: 0, overageHours: 0 };

  const startDate = booking.dates?.startDate || new Date();
  const balance = await getMembershipHourBalance(
    MonthlyHours,
    booking.user,
    settings,
    startDate,
  );
  const overageHours = Math.max(0, hours - balance.freeHoursLeft);
  const yearMonth = yearMonthKey(startDate);

  await MonthlyHours.findOneAndUpdate(
    { user: booking.user, yearMonth },
    { $inc: { totalHoursUsed: hours } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  booking.membershipHoursReservation = {
    hours,
    yearMonth,
    reservedAt: new Date(),
    restoredAt: null,
    restorationReason: null,
  };
  await booking.save();

  return { reserved: true, hours, overageHours };
}

/**
 * Restore a reservation once for an allowed/on-time customer cancellation.
 */
async function restoreMembershipHours(booking, reason = 'Eligible cancellation') {
  const reservation = booking.membershipHoursReservation;
  if (!reservation?.reservedAt || reservation?.restoredAt) {
    return { restored: false, hours: 0 };
  }

  const hours = Math.max(0, Number(reservation.hours || 0));
  if (hours <= 0 || !reservation.yearMonth) {
    return { restored: false, hours: 0 };
  }

  await MonthlyHours.findOneAndUpdate(
    { user: booking.user, yearMonth: reservation.yearMonth },
    { $inc: { totalHoursUsed: -hours } },
  );
  // Guard against legacy / manual values going below zero.
  await MonthlyHours.updateOne(
    {
      user: booking.user,
      yearMonth: reservation.yearMonth,
      totalHoursUsed: { $lt: 0 },
    },
    { $set: { totalHoursUsed: 0 } },
  );

  booking.membershipHoursReservation.restoredAt = new Date();
  booking.membershipHoursReservation.restorationReason = reason;
  await booking.save();

  return { restored: true, hours };
}

module.exports = {
  reserveMembershipHours,
  restoreMembershipHours,
};

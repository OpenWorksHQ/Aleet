/**
 * controllers/admin/adminBookingController.js
 * ---------------------------------------------------------------------------
 * Admin actions on a booking: manual and automatic driver assignment,
 * re-dispatch, unassign, cancel, and trip/price edits. Moved verbatim out of
 * the original controllers/adminController.js.
 * ---------------------------------------------------------------------------
 */

const Booking = require('../../models/Booking');
const User = require('../../models/User');
const TierSettings = require('../../models/TierSettings');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendForbidden,
  sendConflict,
} = require('../../utils/responseHelper');
const {
  evaluateDriver,
  getRankedDriversForBooking,
  autoAssignDriver,
  autoDispatchBooking,
} = require('../../services/dispatchService');
const { sendTripAlert, formatTripTime } = require('../../services/twilioService');
const {
  reserveMembershipHours,
  restoreMembershipHours,
} = require('../../services/membershipReservationService');

async function reserveHoursForMemberBooking(booking, driver) {
  const customer = await User.findById(booking.user).select('subscriptionStatus').lean();
  if (customer?.subscriptionStatus !== 'subscriber') return;
  const settings = await TierSettings.findOne();
  await reserveMembershipHours(booking, settings, driver);
}

const assignDriverToBooking = async (req, res) => {
  try {
    const { bookingId, driverId } = req.body;

    if (!bookingId || !driverId) {
      return sendValidationError(res, 'Booking ID and Driver ID are required');
    }

    // Find the booking by ID
    const booking = await Booking.findById(bookingId);
    if (!booking) return sendNotFound(res, 'Booking not found');

    if (['Cancelled', 'Completed', 'Expired'].includes(booking.status)) {
      return sendValidationError(res, `Cannot assign a driver to a ${booking.status.toLowerCase()} booking`);
    }
    if (booking.paymentStatus !== 'Paid') {
      return sendValidationError(res, 'Payment is required before driver assignment');
    }

    // Find the driver by ID
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return sendValidationError(res, 'Invalid driver');
    }

    // Dispatch eligibility — tier / membership / vehicle / region gates
    const { eligible, reason } = evaluateDriver(driver, booking);
    if (!eligible) {
      return sendForbidden(res, reason || 'Driver is not eligible for this booking');
    }

    // Assign driver to the booking
    booking.assignedDriver = driverId;
    booking.status = 'Confirmed';  // Confirm booking once assigned
    await booking.save();
    await reserveHoursForMemberBooking(booking, driver);

    return sendSuccess(res, 200, 'Driver assigned successfully', booking);
  } catch (error) {
    console.error('Assign Driver Error:', error);
    return sendError(res, 500, error.message || 'Failed to assign driver');
  }
};

// GET /api/admin/bookings/:id/eligible-drivers
// Returns all drivers ranked for a booking — eligible first (tier priority,
// then rating), ineligible drivers follow with a reason.
const getEligibleDriversForBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return sendNotFound(res, 'Booking not found');
    if (booking.paymentStatus !== 'Paid')
      return sendValidationError(res, 'Payment is required before viewing driver assignment');

    const result = await getRankedDriversForBooking(booking);
    return sendSuccess(res, 200, 'Eligible drivers retrieved', result);
  } catch (error) {
    console.error('Get Eligible Drivers Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve eligible drivers');
  }
};
// POST /api/admin/bookings/:id/auto-assign
// Auto-dispatch — assigns the single best eligible driver (tier priority, then
// rating) and confirms the booking. Returns 409 when no driver is eligible.
const autoAssignDriverToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return sendNotFound(res, 'Booking not found');

    if (['Cancelled', 'Completed', 'Expired'].includes(booking.status)) {
      return sendValidationError(res, `Cannot auto-assign a driver to a ${booking.status.toLowerCase()} booking`);
    }
    if (booking.assignedDriver) {
      return sendValidationError(res, 'Booking already has an assigned driver');
    }
    if (booking.paymentStatus !== 'Paid') {
      return sendValidationError(res, 'Payment is required before driver assignment');
    }

    const { driver, sameDay, membershipTrip, candidates } = await autoAssignDriver(booking);
    if (!driver) {
      return sendConflict(
        res,
        candidates.length
          ? `No eligible driver available — all ${candidates.length} driver(s) were ruled out by tier, vehicle, or region rules.`
          : 'No drivers exist to dispatch.',
      );
    }

    booking.assignedDriver = driver._id;
    booking.status = 'Confirmed';
    await booking.save();
    await reserveHoursForMemberBooking(booking, driver);

    // Trip-alert SMS — notify guest + driver (fire-and-forget, never throws)
    (async () => {
      try {
        const [guest, driverDoc] = await Promise.all([
          User.findById(booking.user),
          User.findById(driver._id),
        ]);
        const when = formatTripTime(booking.dates?.startDate);
        if (guest) {
          sendTripAlert(guest, 'guest_driver_assigned', { driverName: driver.name, when });
        }
        if (driverDoc) {
          sendTripAlert(driverDoc, 'driver_new_assignment', { when, pickup: booking.pickupLocation });
        }
      } catch (e) {
        console.error('Auto-assign trip-alert SMS failed:', e?.message || e);
      }
    })();

    return sendSuccess(res, 200, 'Driver auto-assigned successfully', {
      booking,
      assignedDriver: {
        _id: driver._id,
        name: driver.name,
        tier: driver.tier,
        rating: driver.rating,
        selectPro: driver.selectPro,
      },
      dispatch: { sameDay, membershipTrip },
    });
  } catch (error) {
    console.error('Auto-Assign Driver Error:', error);
    return sendError(res, 500, error.message || 'Failed to auto-assign driver');
  }
};

// POST /api/admin/bookings/:id/redispatch
// Admin re-runs the auto-dispatch offer flow on a Pending booking — used after
// a driver cancels, an offer expires without acceptance, or the admin clears
// the previous driver and wants the system to find a new one.
const redispatchBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return sendNotFound(res, 'Booking not found');

    if (['Completed', 'Cancelled', 'Expired'].includes(booking.status)) {
      return sendValidationError(res, `Cannot re-dispatch a ${booking.status.toLowerCase()} booking`);
    }
    if (booking.assignedDriver) {
      return sendValidationError(res, 'Booking already has an assigned driver — unassign first');
    }
    if (booking.paymentStatus !== 'Paid') {
      return sendValidationError(res, 'Payment is required before dispatch');
    }

    const { drivers, stage, tiers } = await autoDispatchBooking(booking);

    // Fire-and-forget SMS to the offer recipients
    (async () => {
      try {
        const when = formatTripTime(booking.dates?.startDate);
        for (const driver of drivers) {
          sendTripAlert(driver, 'driver_trip_offer', {
            when,
            pickup: booking.pickupLocation,
          }).catch(e => console.error('SMS driver_trip_offer failed:', e?.message));
        }
      } catch (e) {
        console.error('Re-dispatch SMS fan-out failed:', e?.message || e);
      }
    })();

    return sendSuccess(res, 200, 'Trip re-dispatched', {
      stage,
      tiers,
      driversNotified: drivers.length,
    });
  } catch (error) {
    console.error('Re-Dispatch Booking Error:', error);
    return sendError(res, 500, error.message || 'Failed to re-dispatch booking');
  }
};

// PATCH /api/admin/bookings/:id/unassign
// Admin removes the currently-assigned driver and resets the booking to
// Pending. Does NOT auto re-dispatch — the admin chooses whether to redispatch
// or manually assign next.
const unassignDriverFromBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const booking = await Booking.findById(id);
    if (!booking) return sendNotFound(res, 'Booking not found');

    if (['Completed', 'Cancelled', 'Expired'].includes(booking.status)) {
      return sendValidationError(res, `Cannot unassign on a ${booking.status.toLowerCase()} booking`);
    }
    if (!booking.assignedDriver) {
      return sendValidationError(res, 'Booking has no assigned driver');
    }

    const previousDriverId = booking.assignedDriver;

    await Booking.updateOne(
      { _id: id },
      {
        $set: {
          assignedDriver: null,
          status: 'Pending',
          'offer.stage': 0,
          'offer.offeredAt': null,
          'offer.expiresAt': null,
          'offer.tiers': [],
          cancellation: {
            cancelledBy: req.user.id,
            cancelledAt: new Date(),
            reason: reason || 'Unassigned by admin',
          },
        },
      },
    );

    return sendSuccess(res, 200, 'Driver unassigned — booking is back to Pending', {
      bookingId: id,
      previousDriverId,
      status: 'Pending',
    });
  } catch (error) {
    console.error('Unassign Driver Error:', error);
    return sendError(res, 500, error.message || 'Failed to unassign driver');
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/bookings/:id/cancel
// Admin cancels a trip (sets status Cancelled).
// ---------------------------------------------------------------------------
const cancelBookingAsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    const booking = await Booking.findById(id);
    if (!booking) return sendNotFound(res, 'Booking not found');
    if (['Cancelled', 'Completed', 'Expired'].includes(booking.status)) {
      return sendValidationError(res, `Cannot cancel a ${booking.status.toLowerCase()} booking`);
    }

    booking.status = 'Cancelled';
    booking.cancellation = {
      cancelledBy: req.user.id,
      cancelledAt: new Date(),
      reason: reason || 'Cancelled by admin',
    };
    booking.offer = {
      stage: 0,
      offeredAt: null,
      expiresAt: null,
      tiers: [],
      offeredTo: [],
    };
    const restoration = await restoreMembershipHours(
      booking,
      reason || 'Cancelled by admin',
    );
    await booking.save();

    return sendSuccess(res, 200, 'Booking cancelled', {
      booking,
      membershipHoursRestored: restoration.hours,
    });
  } catch (error) {
    console.error('cancelBookingAsAdmin Error:', error);
    return sendError(res, 500, error.message || 'Failed to cancel booking');
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/bookings/:id
// Admin updates trip info and/or adjusts price.
// Body may include: pickupLocation, dropoffLocation, specialNotes,
//   startDate, endDate, finalPrice, regularPrice
// ---------------------------------------------------------------------------
const updateBookingAsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return sendNotFound(res, 'Booking not found');
    if (['Cancelled', 'Expired'].includes(booking.status)) {
      return sendValidationError(res, `Cannot update a ${booking.status.toLowerCase()} booking`);
    }

    const {
      pickupLocation,
      dropoffLocation,
      specialNotes,
      startDate,
      endDate,
      finalPrice,
      regularPrice,
    } = req.body || {};

    if (pickupLocation !== undefined) {
      const text = String(pickupLocation).trim();
      if (!text) return sendValidationError(res, 'pickupLocation cannot be empty');
      booking.pickupLocation = text;
    }
    if (dropoffLocation !== undefined) {
      booking.dropoffLocation = dropoffLocation === null || dropoffLocation === ''
        ? null
        : String(dropoffLocation).trim();
    }
    if (specialNotes !== undefined) {
      booking.specialNotes = specialNotes === null || specialNotes === ''
        ? null
        : String(specialNotes).trim();
    }

    if (startDate !== undefined || endDate !== undefined) {
      const nextStart = startDate ? new Date(startDate) : new Date(booking.dates.startDate);
      const nextEnd = endDate ? new Date(endDate) : new Date(booking.dates.endDate);
      if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
        return sendValidationError(res, 'Invalid startDate or endDate');
      }
      if (nextEnd <= nextStart) {
        return sendValidationError(res, 'endDate must be after startDate');
      }
      booking.dates.startDate = nextStart;
      booking.dates.endDate = nextEnd;
    }

    if (finalPrice !== undefined) {
      const price = Number(finalPrice);
      if (!Number.isFinite(price) || price < 0) {
        return sendValidationError(res, 'finalPrice must be a non-negative number');
      }
      booking.finalPrice = price;
      if (booking.regularPrice != null && booking.regularPrice >= price) {
        booking.savings = Math.max(0, Number((booking.regularPrice - price).toFixed(2)));
      }
    }

    if (regularPrice !== undefined) {
      const price = Number(regularPrice);
      if (!Number.isFinite(price) || price < 0) {
        return sendValidationError(res, 'regularPrice must be a non-negative number');
      }
      booking.regularPrice = price;
      booking.savings = Math.max(0, Number((price - (booking.finalPrice || 0)).toFixed(2)));
    }

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('region', 'name code')
      .populate('vehicleType', 'name hourlyPrice')
      .populate('addOns', 'name price type')
      .populate('assignedDriver', 'name phone');

    return sendSuccess(res, 200, 'Booking updated', populated);
  } catch (error) {
    console.error('updateBookingAsAdmin Error:', error);
    return sendError(res, 500, error.message || 'Failed to update booking');
  }
};

module.exports = {
  reserveHoursForMemberBooking,
  assignDriverToBooking,
  getEligibleDriversForBooking,
  autoAssignDriverToBooking,
  redispatchBooking,
  unassignDriverFromBooking,
  cancelBookingAsAdmin,
  updateBookingAsAdmin,
};

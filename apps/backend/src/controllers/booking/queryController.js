/**
 * controllers/booking/queryController.js
 * ---------------------------------------------------------------------------
 * Read-only booking endpoints: the admin list, the customer's own list, a
 * single booking, and the admin stat cards. Moved verbatim out of the original
 * controllers/bookingController.js.
 * ---------------------------------------------------------------------------
 */

const asyncHandler = require('express-async-handler');

const Booking = require('../../models/Booking');

const { getPagination, getSorting, getSearchQuery } = require('../../utils/queryHelper');
const {
    sendSuccess,
    sendError,
    sendValidationError,
    sendNotFound,
    sendForbidden,
    sendPaginated
} = require('../../utils/responseHelper');

// ---------------------------------------------------------------------------
// GET /api/bookings  (Admin paginated list)
// ---------------------------------------------------------------------------
const getAllBookings = asyncHandler(async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const sort   = getSorting(req.query.sortBy, req.query.order);
        const search = getSearchQuery(req.query.search, ['pickupLocation', 'dropoffLocation', 'status']);

        if (req.query.status)        search.status        = req.query.status;
        if (req.query.bookingMode)   search.bookingMode   = req.query.bookingMode;
        if (req.query.paymentStatus) search.paymentStatus = req.query.paymentStatus;

        // timeWindow: current | future | past (by trip start date)
        const timeWindow = typeof req.query.timeWindow === 'string'
            ? req.query.timeWindow.trim().toLowerCase()
            : '';
        if (timeWindow === 'current' || timeWindow === 'today') {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            search['dates.startDate'] = { $gte: startOfToday, $lte: endOfToday };
            if (!req.query.status) {
                search.status = { $nin: ['Completed', 'Cancelled', 'Expired'] };
            }
        } else if (timeWindow === 'future') {
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            search['dates.startDate'] = { $gt: endOfToday };
            if (!req.query.status) {
                search.status = { $nin: ['Completed', 'Cancelled', 'Expired'] };
            }
        } else if (timeWindow === 'past') {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const pastClause = {
                $or: [
                    { 'dates.endDate': { $lt: startOfToday } },
                    { status: { $in: ['Completed', 'Cancelled', 'Expired'] } },
                ],
            };
            if (search.$or) {
                search.$and = [{ $or: search.$or }, pastClause];
                delete search.$or;
            } else {
                Object.assign(search, pastClause);
            }
        }

        const defaultSort = timeWindow === 'past'
            ? { 'dates.startDate': -1 }
            : timeWindow === 'future' || timeWindow === 'current' || timeWindow === 'today'
                ? { 'dates.startDate': 1 }
                : sort;

        const [bookings, total] = await Promise.all([
            Booking.find(search)
                .populate('user', 'name email phone')
                .populate('region', 'name code')
                .populate('vehicleType', 'name hourlyPrice')
                .populate('addOns', 'name price type')
                .populate('assignedDriver', 'name phone')
                .sort(defaultSort || sort).skip(skip).limit(limit),
            Booking.countDocuments(search)
        ]);

        return sendPaginated(res, 'Bookings retrieved successfully', bookings, { page, limit, total });
    } catch (error) {
        console.error('Get All Bookings Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve bookings');
    }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/my
// ---------------------------------------------------------------------------
const getMyBookings = asyncHandler(async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const sort = getSorting(req.query.sortBy, req.query.order) || { createdAt: -1 };

        const filter = { user: req.user.id };
        if (req.query.status)      filter.status      = req.query.status;
        if (req.query.bookingMode) filter.bookingMode = req.query.bookingMode;

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate('vehicleType', 'name hourlyPrice')
                .populate('addOns', 'name price type')
                .populate('stops.addOnIds', 'name price type')
                .populate('assignedDriver', 'name phone')
                .sort(sort).skip(skip).limit(limit),
            Booking.countDocuments(filter)
        ]);

        return sendPaginated(res, 'Bookings retrieved successfully', bookings, { page, limit, total });
    } catch (error) {
        console.error('Get My Bookings Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve bookings');
    }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/:id
// ---------------------------------------------------------------------------
const getBookingById = asyncHandler(async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('vehicleType', 'name hourlyPrice description')
            .populate('addOns', 'name price type description')
            .populate('stops.addOnIds', 'name price type description')
            .populate('assignedDriver', 'name phone')
            .populate('user', 'name email phone');

        if (!booking) return sendNotFound(res, 'Booking not found');

        const isOwner       = booking.user._id.toString() === req.user.id.toString();
        const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);

        if (!isOwner && !isAdminOrStaff) return sendForbidden(res, 'Access denied');

        return sendSuccess(res, 200, 'Booking retrieved successfully', booking);
    } catch (error) {
        console.error('Get Booking By ID Error:', error);
        if (/Cast to ObjectId/i.test(error.message))
            return sendValidationError(res, 'Invalid booking ID');
        return sendError(res, 500, error.message || 'Failed to retrieve booking');
    }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/stats  (Admin)
// ---------------------------------------------------------------------------
const getAdminBookingStats = asyncHandler(async (req, res) => {
    try {
        const [statusCounts, totalValueAgg, unassigned] = await Promise.all([
            Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Booking.aggregate([{ $group: { _id: null, totalValue: { $sum: '$finalPrice' } } }]),
            Booking.countDocuments({ assignedDriver: null, status: { $nin: ['Cancelled', 'Completed', 'Expired'] } })
        ]);

        const counts = { Pending: 0, Confirmed: 0, 'In Progress': 0, Completed: 0, Cancelled: 0, Expired: 0 };
        for (const { _id, count } of statusCounts) {
            if (_id in counts) counts[_id] = count;
        }

        const totalTrips = Object.values(counts).reduce((a, b) => a + b, 0);
        const totalValue = totalValueAgg[0]?.totalValue ?? 0;

        return sendSuccess(res, 200, 'Booking stats retrieved', {
            totalTrips, ...counts,
            inProgress: counts['In Progress'],
            totalValue: Number(totalValue.toFixed(2)),
            unassigned
        });
    } catch (error) {
        console.error('Admin Booking Stats Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve booking stats');
    }
});

module.exports = {
    getAllBookings,
    getMyBookings,
    getBookingById,
    getAdminBookingStats,
};

/**
 * controllers/admin/adminDashboardController.js
 * ---------------------------------------------------------------------------
 * Read-only admin reporting: the sidebar badge counts and the main dashboard
 * (stat cards, 6-month revenue chart, top drivers, recent trips). Moved
 * verbatim out of the original controllers/adminController.js.
 * ---------------------------------------------------------------------------
 */

const Booking = require('../../models/Booking');
const User = require('../../models/User');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const getSidebarStats = async (req, res) => {
  try {
    const [pendingBookings, pendingDriverApprovals] = await Promise.all([
      Booking.countDocuments({ status: 'Pending' }),
      User.countDocuments({ role: 'driver', 'driver.status': 'pending' }),
    ]);

    return sendSuccess(res, 200, 'Sidebar stats retrieved successfully', {
      pendingBookings,
      pendingDriverApprovals,
    });
  } catch (error) {
    console.error('Get Sidebar Stats Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve sidebar stats');
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();

    // ── Boundaries ────────────────────────────────────────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart); yesterdayEnd.setMilliseconds(-1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(monthStart); lastMonthEnd.setMilliseconds(-1);

    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [activeDrivers, prevWeekDrivers, totalTripsToday, totalTripsYesterday,
      monthRevenue, lastMonthRevenue, recentBookings] = await Promise.all([
        User.countDocuments({ role: 'driver', 'driver.status': 'active', updatedAt: { $gte: weekStart } }),
        User.countDocuments({ role: 'driver', 'driver.status': 'active', updatedAt: { $gte: prevWeekStart, $lt: weekStart } }),
        Booking.countDocuments({ status: 'Completed', completedAt: { $gte: todayStart } }),
        Booking.countDocuments({ status: 'Completed', completedAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
        Booking.aggregate([
          { $match: { status: 'Completed', paymentStatus: 'Paid', completedAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$finalPrice' } } },
        ]),
        Booking.aggregate([
          { $match: { status: 'Completed', paymentStatus: 'Paid', completedAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
          { $group: { _id: null, total: { $sum: '$finalPrice' } } },
        ]),
        Booking.find({ status: { $in: ['Completed', 'Active', 'Pending', 'Cancelled'] } })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('assignedDriver', 'name')
          .lean(),
      ]);

    // ── Revenue chart — last 6 months ─────────────────────────────────────────
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      revenueChart.push({ month: monthNames[d.getMonth()], year: d.getFullYear(), start: d, end });
    }
    const revenueAgg = await Booking.aggregate([
      {
        $match: {
          status: 'Completed',
          paymentStatus: 'Paid',
          completedAt: { $gte: revenueChart[0].start, $lt: revenueChart[revenueChart.length - 1].end },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } },
          revenue: { $sum: '$finalPrice' },
        },
      },
    ]);
    const revenueMap = {};
    for (const r of revenueAgg) revenueMap[`${r._id.year}-${r._id.month}`] = r.revenue;
    const revenueOverview = revenueChart.map((m) => ({
      month: m.month,
      revenue: Math.round((revenueMap[`${m.year}-${m.start.getMonth() + 1}`] || 0) * 100) / 100,
    }));

    // ── Top performing drivers this month ─────────────────────────────────────
    const topDriversAgg = await Booking.aggregate([
      { $match: { status: 'Completed', completedAt: { $gte: monthStart }, assignedDriver: { $ne: null } } },
      {
        $group: {
          _id: '$assignedDriver',
          trips: { $sum: 1 },
          earnings: { $sum: '$finalPrice' },
          avgRating: { $avg: '$rating' },
        },
      },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $addFields: { driver: { $arrayElemAt: ['$driver', 0] } } },
      {
        $project: {
          _id: 0,
          driverId: '$_id',
          name: '$driver.name',
          trips: 1,
          earnings: { $round: ['$earnings', 2] },
          rating: { $round: ['$avgRating', 1] },
        },
      },
    ]);

    // ── Percent change helpers ─────────────────────────────────────────────────
    const pctChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const currentRevenue = monthRevenue[0]?.total || 0;
    const previousRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueChange = pctChange(currentRevenue, previousRevenue);

    // Growth rate = revenue change (simplified)
    const growthRate = revenueChange;

    const tripsChange = pctChange(totalTripsToday, totalTripsYesterday);
    const driverChange = pctChange(activeDrivers, prevWeekDrivers);

    // ── Format recent trips ───────────────────────────────────────────────────
    const recentTrips = recentBookings.map((b, i) => ({
      tripId: `TR${String(i + 1).padStart(3, '0')}`,
      driver: b.assignedDriver?.name || 'Unassigned',
      route: `${b.pickupLocation || '—'} → ${b.dropoffLocation || '—'}`,
      fare: Math.round((b.finalPrice || 0) * 100) / 100,
      status: b.status,
    }));

    return sendSuccess(res, 200, 'Admin dashboard retrieved successfully', {
      stats: {
        activeDrivers: { value: activeDrivers, changePercent: driverChange, label: 'from last week' },
        totalTrips: { value: totalTripsToday, changePercent: tripsChange, label: 'from yesterday' },
        revenue: { value: Math.round(currentRevenue * 100) / 100, changePercent: revenueChange, label: 'from last month' },
        growthRate: { value: growthRate, label: 'Monthly growth' },
      },
      revenueOverview,
      recentTrips,
      topDrivers: topDriversAgg.map((d, i) => ({ rank: i + 1, ...d })),
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve admin dashboard');
  }
};

module.exports = {
  getSidebarStats,
  getAdminDashboard,
};

/**
 * Driver availability for AQD — explicit intent, not browser tab state.
 *
 * A driver counts toward AQD when ALL are true:
 *   - approved Pro or Diamond
 *   - serves the region
 *   - availabilityStatus is `available` or `on_call`
 *   - lastHeartbeatAt within HEARTBEAT_INACTIVITY_MS (default 30 min)
 *
 * Trip assignment is handled separately by CL in availabilityService.
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

const HEARTBEAT_INACTIVITY_MS = 30 * 60 * 1000;
/** Statuses where the driver is actively available (heartbeats run). */
const ACTIVE_AVAILABILITY_STATUSES = ['available', 'on_call'];
/** Statuses that count toward AQD (Pro/Diamond only — tier filter is separate). */
const AQD_STATUSES = ACTIVE_AVAILABILITY_STATUSES;
const ALL_STATUSES = ['off', ...ACTIVE_AVAILABILITY_STATUSES];

const QUALIFIED_FILTER = {
  role: 'driver',
  'driver.status': 'approved',
  'driver.tier': { $in: ['Diamond', 'Pro'] },
};

function heartbeatCutoff() {
  return new Date(Date.now() - HEARTBEAT_INACTIVITY_MS);
}

function isAqdEligible(driverDoc) {
  const d = driverDoc?.driver || driverDoc;
  if (!d) return false;
  if (!AQD_STATUSES.includes(d.availabilityStatus)) return false;
  if (!d.lastHeartbeatAt) return false;
  return new Date(d.lastHeartbeatAt).getTime() >= heartbeatCutoff().getTime();
}

function broadcastAvailability(userId, driverFields) {
  const io = getIo();
  if (!io) return;
  try {
    io.of('/admin').emit('driver:presence', {
      userId: String(userId),
      isOnline: isAqdEligible({ driver: driverFields }),
      availabilityStatus: driverFields.availabilityStatus || 'off',
      lastHeartbeatAt: driverFields.lastHeartbeatAt?.toISOString?.() || null,
    });
  } catch (e) {
    console.error('[availability] broadcast failed:', e?.message || e);
  }
}

function aqdDriverFilter(regionId) {
  return {
    ...QUALIFIED_FILTER,
    'driver.availabilityStatus': { $in: AQD_STATUSES },
    'driver.lastHeartbeatAt': { $gte: heartbeatCutoff() },
    $or: [
      { 'driver.serveAllRegions': { $ne: false } },
      { 'driver.regions': regionId },
    ],
  };
}

async function getAvailability(userId) {
  const user = await User.findById(userId)
    .select('role driver.availabilityStatus driver.availabilityUpdatedAt driver.lastHeartbeatAt driver.tier driver.status')
    .lean();
  if (!user || user.role !== 'driver') return null;

  return {
    status: user.driver?.availabilityStatus || 'off',
    tier: user.driver?.tier || null,
    updatedAt: user.driver?.availabilityUpdatedAt?.toISOString?.() || null,
    lastHeartbeatAt: user.driver?.lastHeartbeatAt?.toISOString?.() || null,
    countsForAqd: isAqdEligible(user),
    heartbeatTimeoutMinutes: HEARTBEAT_INACTIVITY_MS / 60000,
  };
}

async function setAvailability(userId, status) {
  if (!ALL_STATUSES.includes(status)) {
    const err = new Error(`Invalid availability status: ${status}`);
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId).select('role driver.tier driver.status').lean();
  if (!user || user.role !== 'driver') {
    const err = new Error('Drivers only');
    err.statusCode = 403;
    throw err;
  }

  if (status !== 'off') {
    if (user.driver?.status !== 'approved') {
      const err = new Error('Only approved drivers can go available');
      err.statusCode = 403;
      throw err;
    }
  }

  const now = new Date();
  const fields = {
    availabilityStatus: status,
    availabilityUpdatedAt: now,
    lastHeartbeatAt: status === 'off' ? null : now,
    isOnline: status !== 'off',
  };

  await User.updateOne(
    { _id: userId, role: 'driver' },
    { $set: Object.fromEntries(Object.entries(fields).map(([k, v]) => [`driver.${k}`, v])) },
  );

  const updatedUser = await User.findById(userId)
    .select('driver.tier driver.availabilityStatus driver.lastHeartbeatAt')
    .lean();

  broadcastAvailability(userId, {
    ...fields,
    tier: updatedUser?.driver?.tier,
  });

  return {
    status,
    tier: updatedUser?.driver?.tier || null,
    updatedAt: now.toISOString(),
    lastHeartbeatAt: fields.lastHeartbeatAt?.toISOString?.() || null,
    countsForAqd: isAqdEligible(updatedUser),
  };
}

async function recordHeartbeat(userId) {
  const now = new Date();
  const result = await User.updateOne(
    { _id: userId, role: 'driver', 'driver.availabilityStatus': { $in: ACTIVE_AVAILABILITY_STATUSES } },
    { $set: { 'driver.lastHeartbeatAt': now, 'driver.isOnline': true } },
  );

  if (result.matchedCount === 0) return null;

  const user = await User.findById(userId)
    .select('driver.availabilityStatus driver.lastHeartbeatAt')
    .lean();

  broadcastAvailability(userId, {
    availabilityStatus: user?.driver?.availabilityStatus,
    lastHeartbeatAt: now,
  });

  return { lastHeartbeatAt: now };
}

async function markOff(userId) {
  return setAvailability(userId, 'off');
}

async function sweepStaleAvailability() {
  const cutoff = heartbeatCutoff();
  const result = await User.updateMany(
    {
      role: 'driver',
      'driver.availabilityStatus': { $in: ACTIVE_AVAILABILITY_STATUSES },
      $or: [
        { 'driver.lastHeartbeatAt': { $lt: cutoff } },
        { 'driver.lastHeartbeatAt': null },
      ],
    },
    {
      $set: {
        'driver.availabilityStatus': 'off',
        'driver.lastHeartbeatAt': null,
        'driver.isOnline': false,
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(`[availability-sweeper] turned off ${result.modifiedCount} stale driver(s)`);
  }
  return result.modifiedCount;
}

module.exports = {
  HEARTBEAT_INACTIVITY_MS,
  ACTIVE_AVAILABILITY_STATUSES,
  AQD_STATUSES,
  ALL_STATUSES,
  isAqdEligible,
  aqdDriverFilter,
  getAvailability,
  setAvailability,
  recordHeartbeat,
  markOff,
  sweepStaleAvailability,
};

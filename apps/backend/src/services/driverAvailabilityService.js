/**
 * Driver availability for AQD — explicit intent vs coverage liveness.
 *
 * Two separate concepts:
 *
 *   availabilityStatus (intent) — stays Available until driver/admin turns off.
 *                                 NOT cleared by missed heartbeats.
 *
 *   lastHeartbeatAt (AQD liveness) — Pro/Diamond drivers count toward AQD only
 *                                    while heartbeat is within AQD_HEARTBEAT_MS.
 *
 * Same-day formula unchanged: AQD − RB − CL ≥ MCT
 *   CL still removes drivers on Confirmed / In Progress overlapping trips.
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

/** How long a heartbeat remains valid for AQD counting (4 hours). */
const AQD_HEARTBEAT_MS = 4 * 60 * 60 * 1000;
const HEARTBEAT_INACTIVITY_MS = AQD_HEARTBEAT_MS;

/** Statuses where the driver has turned availability on (intent). */
const ACTIVE_AVAILABILITY_STATUSES = ['available', 'on_call'];
const AQD_STATUSES = ACTIVE_AVAILABILITY_STATUSES;
const ALL_STATUSES = ['off', ...ACTIVE_AVAILABILITY_STATUSES];

const QUALIFIED_FILTER = {
  role: 'driver',
  'driver.status': 'approved',
  'driver.tier': { $in: ['Diamond', 'Pro'] },
};

function heartbeatCutoff() {
  return new Date(Date.now() - AQD_HEARTBEAT_MS);
}

function hasActiveAvailabilityIntent(driverDoc) {
  const d = driverDoc?.driver || driverDoc;
  return ACTIVE_AVAILABILITY_STATUSES.includes(d?.availabilityStatus);
}

function isHeartbeatFresh(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return false;
  return new Date(lastHeartbeatAt).getTime() >= heartbeatCutoff().getTime();
}

/** True when driver should count in the AQD term of the same-day formula. */
function isAqdEligible(driverDoc) {
  const d = driverDoc?.driver || driverDoc;
  if (!d) return false;
  if (!AQD_STATUSES.includes(d.availabilityStatus)) return false;
  if (!['Pro', 'Diamond'].includes(d.tier)) return false;
  if (d.status && d.status !== 'approved') return false;
  return isHeartbeatFresh(d.lastHeartbeatAt);
}

function broadcastAvailability(userId, driverFields) {
  const io = getIo();
  if (!io) return;
  try {
    const payload = {
      userId: String(userId),
      isOnline: isAqdEligible({ driver: driverFields }),
      availabilityStatus: driverFields.availabilityStatus || 'off',
      lastHeartbeatAt: driverFields.lastHeartbeatAt?.toISOString?.() || null,
    };
    io.of('/admin').emit('driver:presence', payload);
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

  const countsForAqd = isAqdEligible(user);

  return {
    status: user.driver?.availabilityStatus || 'off',
    tier: user.driver?.tier || null,
    updatedAt: user.driver?.availabilityUpdatedAt?.toISOString?.() || null,
    lastHeartbeatAt: user.driver?.lastHeartbeatAt?.toISOString?.() || null,
    countsForAqd,
    heartbeatFresh: isHeartbeatFresh(user.driver?.lastHeartbeatAt),
    heartbeatTimeoutMinutes: AQD_HEARTBEAT_MS / 60000,
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
    .select('driver.tier driver.status driver.availabilityStatus driver.lastHeartbeatAt')
    .lean();

  const driverFields = {
    ...fields,
    tier: updatedUser?.driver?.tier,
    status: updatedUser?.driver?.status,
  };

  broadcastAvailability(userId, driverFields);

  return {
    status,
    tier: updatedUser?.driver?.tier || null,
    updatedAt: now.toISOString(),
    lastHeartbeatAt: fields.lastHeartbeatAt?.toISOString?.() || null,
    countsForAqd: isAqdEligible(updatedUser),
    heartbeatFresh: isHeartbeatFresh(fields.lastHeartbeatAt),
  };
}

async function recordHeartbeat(userId) {
  const user = await User.findById(userId)
    .select('role driver.availabilityStatus driver.tier driver.status')
    .lean();

  if (!user || user.role !== 'driver') return null;
  if (!hasActiveAvailabilityIntent(user)) return null;

  const now = new Date();
  await User.updateOne(
    { _id: userId, role: 'driver' },
    { $set: { 'driver.lastHeartbeatAt': now, 'driver.isOnline': true } },
  );

  broadcastAvailability(userId, {
    availabilityStatus: user.driver?.availabilityStatus,
    lastHeartbeatAt: now,
    tier: user.driver?.tier,
    status: user.driver?.status,
  });

  return { lastHeartbeatAt: now };
}

async function markOff(userId) {
  return setAvailability(userId, 'off');
}

/**
 * Sync denormalized isOnline flag for admin UI.
 * Does NOT change availabilityStatus — intent stays until manual off.
 */
async function syncDenormalizedOnlineFlags() {
  const cutoff = heartbeatCutoff();

  const stale = await User.updateMany(
    {
      role: 'driver',
      'driver.availabilityStatus': { $in: ACTIVE_AVAILABILITY_STATUSES },
      $or: [
        { 'driver.lastHeartbeatAt': { $lt: cutoff } },
        { 'driver.lastHeartbeatAt': null },
      ],
    },
    { $set: { 'driver.isOnline': false } },
  );

  const fresh = await User.updateMany(
    {
      role: 'driver',
      'driver.availabilityStatus': { $in: ACTIVE_AVAILABILITY_STATUSES },
      'driver.lastHeartbeatAt': { $gte: cutoff },
    },
    { $set: { 'driver.isOnline': true } },
  );

  const modified = (stale.modifiedCount || 0) + (fresh.modifiedCount || 0);
  if (modified > 0) {
    console.log(`[availability-sync] refreshed isOnline for ${modified} driver(s)`);
  }
  return modified;
}

module.exports = {
  AQD_HEARTBEAT_MS,
  HEARTBEAT_INACTIVITY_MS,
  ACTIVE_AVAILABILITY_STATUSES,
  AQD_STATUSES,
  ALL_STATUSES,
  hasActiveAvailabilityIntent,
  isHeartbeatFresh,
  isAqdEligible,
  aqdDriverFilter,
  getAvailability,
  setAvailability,
  recordHeartbeat,
  markOff,
  syncDenormalizedOnlineFlags,
  // Legacy export name used by cron
  sweepStaleAvailability: syncDenormalizedOnlineFlags,
};

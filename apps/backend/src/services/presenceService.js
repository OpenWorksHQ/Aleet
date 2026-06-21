/**
 * Driver presence for AQD / admin UI.
 *
 * AQD counts a driver when lastSeenAt is fresh (within 5 min) — NOT when a
 * WebSocket happens to be connected. Mobile OS backgrounding drops sockets
 * without meaning the driver logged out.
 *
 * - Heartbeat (HTTP or socket) → bump lastSeenAt
 * - Explicit logout (HTTP)     → clear lastSeenAt immediately (drops from AQD)
 * - Socket disconnect          → no DB change (not a logout)
 * - Sweeper                    → clears stale isOnline flag only
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

const PRESENCE_FRESHNESS_MS = 5 * 60 * 1000;

function isPresenceFresh(lastSeenAt) {
  if (!lastSeenAt) return false;
  return new Date(lastSeenAt).getTime() >= Date.now() - PRESENCE_FRESHNESS_MS;
}

function broadcastPresence(payload) {
  const io = getIo();
  if (!io) return;
  try {
    io.of('/admin').emit('driver:presence', payload);
  } catch (e) {
    console.error('[presence] broadcast failed:', e?.message || e);
  }
}

async function markOnline(userId) {
  return User.findOneAndUpdate(
    {
      _id: userId,
      role: 'driver',
      'driver.status': 'approved',
      'driver.tier': { $in: ['Diamond', 'Pro'] },
    },
    { $set: { 'driver.isOnline': true, 'driver.lastSeenAt': new Date() } },
    { new: true, projection: { 'driver.isOnline': 1, 'driver.lastSeenAt': 1 } },
  ).lean();
}

/** Bump freshness — keeps driver in AQD while the app session is alive. */
async function touchLastSeen(userId) {
  const now = new Date();
  await User.updateOne(
    {
      _id: userId,
      role: 'driver',
      'driver.status': 'approved',
      'driver.tier': { $in: ['Diamond', 'Pro'] },
    },
    { $set: { 'driver.isOnline': true, 'driver.lastSeenAt': now } },
  );
  return now;
}

/** Explicit logout — remove from AQD immediately. */
async function markOfflineImmediate(userId) {
  const doc = await User.findOneAndUpdate(
    { _id: userId, role: 'driver' },
    { $set: { 'driver.isOnline': false, 'driver.lastSeenAt': null } },
    { new: true, projection: { 'driver.isOnline': 1, 'driver.lastSeenAt': 1 } },
  ).lean();

  broadcastPresence({
    userId: String(userId),
    isOnline: false,
    lastSeenAt: null,
  });

  return doc;
}

async function recordHeartbeat(userId) {
  const lastSeenAt = await touchLastSeen(userId);
  broadcastPresence({
    userId: String(userId),
    isOnline: true,
    lastSeenAt: lastSeenAt.toISOString(),
  });
  return lastSeenAt;
}

async function recordConnect(userId) {
  const doc = await markOnline(userId);
  if (doc) {
    broadcastPresence({
      userId: String(userId),
      isOnline: true,
      lastSeenAt: doc.driver?.lastSeenAt?.toISOString?.() || new Date().toISOString(),
    });
  }
  return doc;
}

module.exports = {
  PRESENCE_FRESHNESS_MS,
  isPresenceFresh,
  broadcastPresence,
  markOnline,
  touchLastSeen,
  markOfflineImmediate,
  recordHeartbeat,
  recordConnect,
};

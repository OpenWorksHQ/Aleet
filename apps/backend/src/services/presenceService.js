/**
 * Driver presence for AQD / admin UI.
 *
 * AQD counts a driver while their portal SESSION is active (isOnline=true),
 * not while a WebSocket is connected or a heartbeat arrived in the last N minutes.
 * Mobile backgrounding suspends JS — that is still a logged-in session.
 *
 * - Login / connect / heartbeat → isOnline=true, bump lastSeenAt
 * - Explicit logout (HTTP)       → isOnline=false immediately (drops from AQD)
 * - Browser tab closed (client)  → isOnline=false immediately (pagehide beacon)
 * - Socket gone, no heartbeat    → isOnline=false after DISCONNECT_OFFLINE_MS
 *   (catches browser killed without pagehide; cancelled by background heartbeat)
 * - Sweeper (45 min backup)      → abandoned sessions with no signals at all
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

/** For admin UI only — "active in the last few minutes". NOT used for AQD. */
const PRESENCE_FRESHNESS_MS = 5 * 60 * 1000;

/** After last socket drops: mark offline unless a heartbeat arrives (browser close). */
const DISCONNECT_OFFLINE_MS = 2 * 60 * 1000;

/** Abandoned sessions — safety net when all client signals fail. */
const SESSION_ABANDON_MS = 45 * 60 * 1000;

/** @type {Map<string, NodeJS.Timeout>} */
const pendingDisconnectOffline = new Map();

function cancelPendingDisconnectOffline(userId) {
  const key = String(userId);
  const timer = pendingDisconnectOffline.get(key);
  if (timer) {
    clearTimeout(timer);
    pendingDisconnectOffline.delete(key);
  }
}

/** Schedule offline when socket is gone — skipped if a heartbeat arrived recently
 * (app-switch hidden ping). Cancelled by reconnect or HTTP heartbeat. */
async function scheduleDisconnectOffline(userId) {
  cancelPendingDisconnectOffline(userId);
  const key = String(userId);

  const user = await User.findById(userId).select('driver.lastSeenAt').lean();
  const lastSeen = user?.driver?.lastSeenAt;
  if (lastSeen && Date.now() - new Date(lastSeen).getTime() < 60 * 1000) {
    // Recent hidden/visible heartbeat — app background, not browser close.
    return;
  }

  const timer = setTimeout(() => {
    pendingDisconnectOffline.delete(key);
    markOfflineImmediate(userId).catch((e) => {
      console.error('[presence] disconnect-offline failed:', userId, e?.message || e);
    });
  }, DISCONNECT_OFFLINE_MS);
  pendingDisconnectOffline.set(key, timer);
}

/** True when the driver had recent app activity (admin "last seen" hint). */
function isPresenceFresh(lastSeenAt) {
  if (!lastSeenAt) return false;
  return new Date(lastSeenAt).getTime() >= Date.now() - PRESENCE_FRESHNESS_MS;
}

/** AQD / admin "online" — active driver-portal session. */
function isSessionOnline(isOnline) {
  return isOnline === true;
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

/** Bump lastSeenAt; keeps isOnline=true for an active session. */
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

/** Explicit logout or tab close — remove from AQD immediately. */
async function markOfflineImmediate(userId) {
  cancelPendingDisconnectOffline(userId);
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
  cancelPendingDisconnectOffline(userId);
  const lastSeenAt = await touchLastSeen(userId);
  broadcastPresence({
    userId: String(userId),
    isOnline: true,
    lastSeenAt: lastSeenAt.toISOString(),
  });
  return lastSeenAt;
}

async function recordConnect(userId) {
  cancelPendingDisconnectOffline(userId);
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
  DISCONNECT_OFFLINE_MS,
  SESSION_ABANDON_MS,
  isPresenceFresh,
  isSessionOnline,
  broadcastPresence,
  markOnline,
  touchLastSeen,
  markOfflineImmediate,
  recordHeartbeat,
  recordConnect,
  cancelPendingDisconnectOffline,
  scheduleDisconnectOffline,
};

/**
 * Driver presence for AQD / admin UI.
 *
 * AQD counts a driver while their portal SESSION is active (isOnline=true),
 * not while a WebSocket is connected or a heartbeat arrived in the last N minutes.
 * Mobile backgrounding suspends JS — that is still a logged-in session.
 *
 * - Login / connect / heartbeat → isOnline=true, bump lastSeenAt
 * - Explicit logout (HTTP)       → isOnline=false immediately (drops from AQD)
 * - Socket disconnect           → no change (not a logout)
 * - Sweeper (24h safety net)    → only if tab closed without logout for a full day
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

/** For admin UI only — "active in the last few minutes". NOT used for AQD. */
const PRESENCE_FRESHNESS_MS = 5 * 60 * 1000;

/** Abandoned sessions (browser killed, no logout) — safety net only. */
const SESSION_ABANDON_MS = 24 * 60 * 60 * 1000;

/** True when the driver had recent app activity (admin "last seen" hint). */
function isPresenceFresh(lastSeenAt) {
  if (!lastSeenAt) return false;
  return new Date(lastSeenAt).getTime() >= Date.now() - PRESENCE_FRESHNESS_MS;
}

/** AQD / admin "online" — logged-in session, cleared only on logout (+ 24h sweeper). */
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
  SESSION_ABANDON_MS,
  isPresenceFresh,
  isSessionOnline,
  broadcastPresence,
  markOnline,
  touchLastSeen,
  markOfflineImmediate,
  recordHeartbeat,
  recordConnect,
};

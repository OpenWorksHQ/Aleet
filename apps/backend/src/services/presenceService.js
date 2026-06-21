/**
 * Driver presence for AQD / admin UI.
 *
 * AQD uses `presenceUntil` — a sliding expiry timestamp, NOT a boolean that
 * stays true until logout. Mobile browsers rarely fire pagehide when the app
 * is swiped away, so we cannot rely on client "offline" beacons alone.
 *
 *   Foreground heartbeat  → presenceUntil = now + 90s  (browser close → AQD drops within ~90s)
 *   Background heartbeat  → presenceUntil = now + 45min (WhatsApp switch → stays in AQD)
 *   Explicit logout       → presenceUntil cleared immediately
 *   Page-close beacon     → presenceUntil cleared immediately (best-effort)
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

/** Admin UI "recently active" hint. */
const PRESENCE_FRESHNESS_MS = 5 * 60 * 1000;

/** Tab open in foreground — short TTL so killed browsers fall out of AQD quickly. */
const FOREGROUND_PRESENCE_MS = 60 * 1000;

/** App backgrounded (WhatsApp etc.) — long TTL while session is still open. */
const BACKGROUND_PRESENCE_MS = 45 * 60 * 1000;

/** Sweeper backup for orphaned rows. */
const SESSION_ABANDON_MS = BACKGROUND_PRESENCE_MS;

const QUALIFIED_FILTER = {
  role: 'driver',
  'driver.status': 'approved',
  'driver.tier': { $in: ['Diamond', 'Pro'] },
};

function isPresenceFresh(lastSeenAt) {
  if (!lastSeenAt) return false;
  return new Date(lastSeenAt).getTime() >= Date.now() - PRESENCE_FRESHNESS_MS;
}

/** True when the driver's portal session is active for AQD. */
function isPresenceActive(presenceUntil) {
  if (!presenceUntil) return false;
  return new Date(presenceUntil).getTime() >= Date.now();
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

function ttlMs(background) {
  return background ? BACKGROUND_PRESENCE_MS : FOREGROUND_PRESENCE_MS;
}

async function extendPresence(userId, background = false) {
  const now = new Date();
  const presenceUntil = new Date(now.getTime() + ttlMs(background));

  await User.updateOne(
    { _id: userId, ...QUALIFIED_FILTER },
    {
      $set: {
        'driver.isOnline': true,
        'driver.lastSeenAt': now,
        'driver.presenceUntil': presenceUntil,
      },
    },
  );

  return { now, presenceUntil };
}

async function markOnline(userId) {
  const { now, presenceUntil } = await extendPresence(userId, false);
  return {
    driver: {
      isOnline: true,
      lastSeenAt: now,
      presenceUntil,
    },
  };
}

async function touchLastSeen(userId, background = false) {
  const { now } = await extendPresence(userId, background);
  return now;
}

async function markOfflineImmediate(userId) {
  const doc = await User.findOneAndUpdate(
    { _id: userId, role: 'driver' },
    {
      $set: {
        'driver.isOnline': false,
        'driver.lastSeenAt': null,
        'driver.presenceUntil': null,
      },
    },
    { new: true, projection: { 'driver.isOnline': 1, 'driver.lastSeenAt': 1, 'driver.presenceUntil': 1 } },
  ).lean();

  broadcastPresence({
    userId: String(userId),
    isOnline: false,
    lastSeenAt: null,
  });

  return doc;
}

async function recordHeartbeat(userId, background = false) {
  const { now, presenceUntil } = await extendPresence(userId, background);
  broadcastPresence({
    userId: String(userId),
    isOnline: true,
    lastSeenAt: now.toISOString(),
  });
  return { lastSeenAt: now, presenceUntil };
}

async function recordConnect(userId) {
  const doc = await markOnline(userId);
  if (doc) {
    broadcastPresence({
      userId: String(userId),
      isOnline: true,
      lastSeenAt: doc.driver.lastSeenAt?.toISOString?.() || new Date().toISOString(),
    });
  }
  return doc;
}

module.exports = {
  PRESENCE_FRESHNESS_MS,
  FOREGROUND_PRESENCE_MS,
  BACKGROUND_PRESENCE_MS,
  SESSION_ABANDON_MS,
  isPresenceFresh,
  isPresenceActive,
  broadcastPresence,
  markOnline,
  touchLastSeen,
  markOfflineImmediate,
  recordHeartbeat,
  recordConnect,
};

/**
 * Driver presence for AQD / admin UI.
 *
 * Socket-driven sliding expiry on `presenceUntil`:
 *
 *   Socket connect           → online, presenceUntil = now + 60s
 *   driver:heartbeat         → foreground, presenceUntil = now + 60s
 *   driver:background        → mobile app switch, presenceUntil = now + 5min
 *   Socket disconnect        → short grace (45s) unless already on 5min background TTL
 *   Explicit logout          → cleared immediately
 */

const User = require('../models/User');
const { getIo } = require('../sockets/ioHolder');

const PRESENCE_FRESHNESS_MS = 5 * 60 * 1000;
const FOREGROUND_PRESENCE_MS = 60 * 1000;
const BACKGROUND_PRESENCE_MS = 5 * 60 * 1000;
const DISCONNECT_GRACE_MS = 45 * 1000;
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

function ttlMs(mode) {
  if (mode === 'background') return BACKGROUND_PRESENCE_MS;
  if (mode === 'disconnect') return DISCONNECT_GRACE_MS;
  return FOREGROUND_PRESENCE_MS;
}

async function setPresence(userId, mode = 'foreground') {
  const now = new Date();
  const presenceUntil = new Date(now.getTime() + ttlMs(mode));
  const presenceMode = mode === 'background' ? 'background' : 'foreground';

  // Skip if driver was explicitly marked offline (browser close / logout).
  const result = await User.updateOne(
    { _id: userId, ...QUALIFIED_FILTER, 'driver.isOnline': { $ne: false } },
    {
      $set: {
        'driver.isOnline': true,
        'driver.lastSeenAt': now,
        'driver.presenceUntil': presenceUntil,
        'driver.presenceMode': presenceMode,
      },
    },
  );

  if (result.matchedCount === 0) return null;

  return { now, presenceUntil, presenceMode };
}

async function markOnline(userId) {
  const now = new Date();
  const presenceUntil = new Date(now.getTime() + ttlMs('foreground'));

  await User.updateOne(
    { _id: userId, ...QUALIFIED_FILTER },
    {
      $set: {
        'driver.isOnline': true,
        'driver.lastSeenAt': now,
        'driver.presenceUntil': presenceUntil,
        'driver.presenceMode': 'foreground',
      },
    },
  );

  return {
    driver: {
      isOnline: true,
      lastSeenAt: now,
      presenceUntil,
    },
  };
}

async function markOfflineImmediate(userId) {
  const doc = await User.findOneAndUpdate(
    { _id: userId, role: 'driver' },
    {
      $set: {
        'driver.isOnline': false,
        'driver.lastSeenAt': null,
        'driver.presenceUntil': null,
        'driver.presenceMode': null,
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

async function recordHeartbeat(userId) {
  const updated = await setPresence(userId, 'foreground');
  if (!updated) return null;
  const { now, presenceUntil } = updated;
  broadcastPresence({
    userId: String(userId),
    isOnline: true,
    lastSeenAt: now.toISOString(),
  });
  return { lastSeenAt: now, presenceUntil };
}

async function recordBackground(userId) {
  const updated = await setPresence(userId, 'background');
  if (!updated) return null;
  const { now, presenceUntil } = updated;
  broadcastPresence({
    userId: String(userId),
    isOnline: true,
    lastSeenAt: now.toISOString(),
  });
  return { lastSeenAt: now, presenceUntil };
}

/**
 * Socket closed. Desktop browser kill → short grace.
 * Mobile background already set a 5min TTL — keep the longer expiry.
 */
async function recordDisconnect(userId) {
  try {
    const user = await User.findById(userId)
      .select('driver.presenceMode driver.presenceUntil driver.lastSeenAt role')
      .lean();

    if (!user || user.role !== 'driver') return;
    if (!user.driver?.presenceUntil && user.driver?.isOnline === false) return;

    const now = Date.now();
    const currentUntil = user.driver?.presenceUntil
      ? new Date(user.driver.presenceUntil).getTime()
      : 0;
    const disconnectUntil = now + DISCONNECT_GRACE_MS;

    // Mobile app-switch / screen-off already granted up to 5 minutes.
    if (user.driver?.presenceMode === 'background' && currentUntil > disconnectUntil) {
      broadcastPresence({
        userId: String(userId),
        isOnline: isPresenceActive(user.driver.presenceUntil),
        lastSeenAt: user.driver?.lastSeenAt?.toISOString?.() || null,
      });
      return;
    }

    const presenceUntil = new Date(disconnectUntil);
    await User.updateOne(
      { _id: userId, role: 'driver' },
      {
        $set: {
          'driver.isOnline': isPresenceActive(presenceUntil),
          'driver.presenceUntil': presenceUntil,
          'driver.presenceMode': 'foreground',
        },
      },
    );

    broadcastPresence({
      userId: String(userId),
      isOnline: isPresenceActive(presenceUntil),
      lastSeenAt: user.driver?.lastSeenAt?.toISOString?.() || null,
    });
  } catch (e) {
    console.error('[presence] recordDisconnect failed:', userId, e?.message || e);
  }
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
  DISCONNECT_GRACE_MS,
  SESSION_ABANDON_MS,
  isPresenceFresh,
  isPresenceActive,
  broadcastPresence,
  markOnline,
  markOfflineImmediate,
  recordHeartbeat,
  recordBackground,
  recordDisconnect,
  recordConnect,
};

const {
  recordConnect,
  recordHeartbeat,
  touchLastSeen,
  scheduleDisconnectOffline,
  cancelPendingDisconnectOffline,
} = require('../services/presenceService');

/** @type {Map<string, number>} userId → active /drivers socket count */
const activeSockets = new Map();

function incrementSockets(userId) {
  const key = String(userId);
  const next = (activeSockets.get(key) || 0) + 1;
  activeSockets.set(key, next);
  return next;
}

function decrementSockets(userId) {
  const key = String(userId);
  const next = Math.max(0, (activeSockets.get(key) || 0) - 1);
  if (next === 0) activeSockets.delete(key);
  else activeSockets.set(key, next);
  return next;
}

/**
 * Socket handlers for /drivers.
 *
 * Connect + heartbeat keep the session alive. Disconnect starts a short timer
 * (cancelled by background HTTP heartbeat or reconnect). Browser tab close
 * also sends an explicit offline beacon from the client.
 */
function registerDriverPresence(_io, socket) {
  const userId = socket.userId;

  cancelPendingDisconnectOffline(userId);
  incrementSockets(userId);

  recordConnect(userId).catch((e) => {
    console.error('[presence] recordConnect failed:', userId, e?.message || e);
  });

  socket.on('driver:heartbeat', () => {
    recordHeartbeat(userId).catch(() => { /* ignore */ });
  });

  socket.onAny((eventName) => {
    if (eventName === 'driver:heartbeat') return;
    touchLastSeen(userId).catch(() => { /* ignore */ });
  });

  if (socket.conn) {
    socket.conn.on('heartbeat', () => {
      touchLastSeen(userId).catch(() => { /* ignore */ });
    });
  }

  socket.on('disconnect', (reason) => {
    const remaining = decrementSockets(userId);
    if (remaining === 0) {
      scheduleDisconnectOffline(userId).catch((e) => {
        console.error('[presence] scheduleDisconnectOffline failed:', userId, e?.message || e);
      });
    }
    console.log(
      `[presence] socket disconnected for ${userId} (${reason}); ` +
      `${remaining} socket(s) left; offline in ~2min unless heartbeat/reconnect`,
    );
  });
}

module.exports = { registerDriverPresence };

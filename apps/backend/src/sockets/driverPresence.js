const {
  recordConnect,
  recordHeartbeat,
  touchLastSeen,
} = require('../services/presenceService');

/**
 * Socket handlers for /drivers — bumps presenceUntil (foreground TTL).
 * Disconnect does NOT clear presence; TTL expiry handles browser kills.
 */
function registerDriverPresence(_io, socket) {
  const userId = socket.userId;

  recordConnect(userId).catch((e) => {
    console.error('[presence] recordConnect failed:', userId, e?.message || e);
  });

  socket.on('driver:heartbeat', () => {
    recordHeartbeat(userId, false).catch(() => { /* ignore */ });
  });

  socket.onAny((eventName) => {
    if (eventName === 'driver:heartbeat') return;
    touchLastSeen(userId, false).catch(() => { /* ignore */ });
  });

  if (socket.conn) {
    socket.conn.on('heartbeat', () => {
      touchLastSeen(userId, false).catch(() => { /* ignore */ });
    });
  }

  socket.on('disconnect', (reason) => {
    console.log(`[presence] socket disconnected for ${userId} (${reason}); TTL unchanged`);
  });
}

module.exports = { registerDriverPresence };

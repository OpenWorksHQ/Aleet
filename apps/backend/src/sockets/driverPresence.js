const {
  recordConnect,
  recordHeartbeat,
  touchLastSeen,
} = require('../services/presenceService');

/**
 * Socket handlers for /drivers.
 *
 * Socket connect + heartbeat bump lastSeenAt (AQD signal).
 * Socket disconnect is NOT logout — mobile background drops sockets constantly;
 * we do not change presence in the DB on disconnect.
 */
function registerDriverPresence(_io, socket) {
  const userId = socket.userId;

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
    console.log(`[presence] socket disconnected for ${userId} (${reason}); presence unchanged`);
  });
}

module.exports = { registerDriverPresence };

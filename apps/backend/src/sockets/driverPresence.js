const {
  recordConnect,
  recordHeartbeat,
  recordBackground,
  recordDisconnect,
} = require('../services/presenceService');

function registerDriverPresence(_io, socket) {
  const userId = socket.userId;

  recordConnect(userId).catch((e) => {
    console.error('[presence] recordConnect failed:', userId, e?.message || e);
  });

  socket.on('driver:heartbeat', () => {
    recordHeartbeat(userId).catch(() => { /* ignore */ });
  });

  // Mobile app switch / screen off — keep driver in AQD for up to 5 minutes.
  socket.on('driver:background', () => {
    recordBackground(userId).catch(() => { /* ignore */ });
  });

  socket.on('disconnect', (reason) => {
    recordDisconnect(userId).catch((e) => {
      console.error('[presence] recordDisconnect failed:', userId, e?.message || e);
    });
    console.log(`[presence] socket disconnected for ${userId} (${reason})`);
  });
}

module.exports = { registerDriverPresence };

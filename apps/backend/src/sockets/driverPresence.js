const { recordHeartbeat } = require('../services/driverAvailabilityService');

function registerDriverPresence(_io, socket) {
  const userId = socket.userId;

  socket.on('driver:heartbeat', () => {
    recordHeartbeat(userId).catch(() => { /* ignore */ });
  });

  // Legacy alias — same as heartbeat while available/on_call.
  socket.on('driver:background', () => {
    recordHeartbeat(userId).catch(() => { /* ignore */ });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] driver disconnected for ${userId} (${reason})`);
  });
}

module.exports = { registerDriverPresence };

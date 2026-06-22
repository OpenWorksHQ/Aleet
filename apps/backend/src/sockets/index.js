const { Server } = require('socket.io');
const socketAuth = require('../middleware/socketAuth');
const { registerDriverPresence } = require('./driverPresence');
const { getSocketCorsConfig } = require('../middleware/cors');
const { setIo } = require('./ioHolder');

/**
 * Initialize the Socket.IO server on top of an existing HTTP server.
 *
 * Namespaces:
 *  - /drivers — trip offers + optional heartbeats while available/on_call.
 *               AQD uses explicit availability status, not socket connect.
 *  - /admin   — admin-app connections. Receives `driver:presence` events
 *               broadcast by driverPresence so the admin UI updates in
 *               real time without polling.
 *
 * Auth: socketAuth middleware verifies the JWT from
 * `handshake.auth.token` (preferred) or `Authorization` header (fallback).
 * Rejecting at this stage closes the socket before any events fire.
 */
function initSockets(httpServer) {
    const io = new Server(httpServer, {
        cors: getSocketCorsConfig(),
    });
    setIo(io);

    const drivers = io.of('/drivers');
    drivers.use(socketAuth);
    drivers.on('connection', (socket) => {
        if (socket.role !== 'driver') {
            socket.disconnect(true);
            return;
        }
        console.log(`[socket] driver connected: ${socket.userId}`);
        // Pass the root io so the presence handler can emit to /admin.
        registerDriverPresence(io, socket);
    });

    const admin = io.of('/admin');
    admin.use(socketAuth);
    admin.on('connection', (socket) => {
        if (socket.role !== 'admin') {
            socket.disconnect(true);
            return;
        }
        console.log(`[socket] admin connected: ${socket.userId}`);
        socket.on('disconnect', (reason) => {
            console.log(`[socket] admin disconnected: ${socket.userId} (${reason})`);
        });
    });

    return io;
}

module.exports = initSockets;

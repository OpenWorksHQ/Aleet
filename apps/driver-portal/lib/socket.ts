// Driver-app Socket.IO client.
//
// The connection itself is the presence signal: connect → backend marks
// driver online; disconnect → backend marks offline (real-time). There is
// no Go Online/Offline toggle.
//
// The backend reads the JWT from `handshake.auth.token`; we read the same
// token from the `auth_token` cookie that the login flow sets.

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

let socket: Socket | null = null;
let foregroundListenersBound = false;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/** Interval between keep-alive pings sent to the backend (ms). */
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

function readAuthToken(): string {
    if (typeof document === "undefined") return "";
    return (
        document.cookie
            .split("; ")
            .find((c) => c.startsWith("auth_token="))
            ?.split("=")[1] ?? ""
    );
}

/**
 * Make sure the socket is live. Called when the page returns to the
 * foreground (mobile background → foreground, tab refocus, network back).
 * Browsers freeze the socket while the page is hidden; Socket.IO's built-in
 * reconnect logic doesn't always detect the freeze, so we poke it manually.
 */
function ensureConnected() {
    if (!socket) {
        // Singleton was never created or got cleared — reinit.
        connectDriverSocket();
        return;
    }
    if (!socket.connected) {
        console.log("[socket] page active, reconnecting…");
        socket.connect();
    }
}

/**
 * Bind one-time listeners that re-attach the socket whenever the driver
 * returns to the app: tab visible again, window focused, network back.
 */
function bindForegroundListeners() {
    if (foregroundListenersBound || typeof window === "undefined") return;
    foregroundListenersBound = true;

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") ensureConnected();
    });
    window.addEventListener("focus", ensureConnected);
    window.addEventListener("online", ensureConnected);
    // pageshow fires when the page is restored from the bfcache (mobile
    // Safari). That's the moment the user came back without a full reload.
    window.addEventListener("pageshow", ensureConnected);
}

/** Connect to the /drivers namespace. Idempotent — repeated calls reuse the same socket. */
export function connectDriverSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (socket && socket.connected) return socket;

    const token = readAuthToken();
    if (!token) return null;

    // Stale-but-not-cleared socket: just reconnect it. Avoids creating a
    // duplicate connection server-side.
    if (socket && !socket.connected) {
        socket.connect();
        bindForegroundListeners();
        return socket;
    }

    socket = io(`${SOCKET_URL}/drivers`, {
        auth: { token },
        ...(SOCKET_URL.includes("ngrok")
            ? { extraHeaders: { "ngrok-skip-browser-warning": "true" } }
            : {}),
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
        // Server marks isOnline=true on connect — no client action needed.
        console.log("[socket] driver connected:", socket?.id);
        startHeartbeat();
    });

    socket.on("disconnect", (reason) => {
        console.log("[socket] driver disconnected:", reason);
        stopHeartbeat();
    });

    socket.on("connect_error", (err) => {
        // Most common reason: stale/expired token. The auth middleware
        // rejects and the socket won't auto-retry forever.
        console.warn("[socket] connect error:", err.message);
    });

    bindForegroundListeners();
    return socket;
}

/**
 * Start the application-level keep-alive interval.
 * Emits `driver:heartbeat` every 2 min so the backend's `socket.onAny()`
 * handler bumps `lastSeenAt` even when the driver is idle (no UI interaction).
 * This is a belt-and-suspenders complement to the Engine.IO heartbeat listener
 * added on the server side.
 */
function startHeartbeat() {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(() => {
        if (socket?.connected) {
            socket.emit('driver:heartbeat');
        }
    }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

/** Disconnect and clear the singleton. Called on logout. */
export function disconnectDriverSocket() {
    stopHeartbeat();
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/** Current socket — null if not connected. Useful for debugging only. */
export function getDriverSocket(): Socket | null {
    return socket;
}

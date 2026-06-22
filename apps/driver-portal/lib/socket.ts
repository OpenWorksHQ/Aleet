// Driver-app Socket.IO client — primary presence signal for AQD.
//
//   connect            → backend marks driver online
//   driver:heartbeat   → foreground keep-alive (tab visible)
//   driver:background  → mobile screen switch — 5 min AQD grace
//   disconnect         → short grace (desktop) or keep 5 min TTL (mobile background)
//
// Explicit logout calls sendPresenceOffline() + disconnectDriverSocket().

import { io, type Socket } from "socket.io-client";
import { sendPresenceBackground } from "@/lib/presence-api";

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

let socket: Socket | null = null;
let foregroundListenersBound = false;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/** Foreground heartbeat — must be less than server FOREGROUND_PRESENCE_MS (60s). */
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

function readAuthToken(): string {
    if (typeof document === "undefined") return "";
    return (
        document.cookie
            .split("; ")
            .find((c) => c.startsWith("auth_token="))
            ?.split("=")[1] ?? ""
    );
}

function isMobileDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function emitHeartbeat() {
    if (socket?.connected) {
        socket.emit("driver:heartbeat");
    }
}

function emitBackground() {
    if (socket?.connected) {
        socket.emit("driver:background");
    }
}

function ensureConnected() {
    if (!socket) {
        connectDriverSocket();
        return;
    }
    if (!socket.connected) {
        console.log("[socket] page active, reconnecting…");
        socket.connect();
    }
}

function bindForegroundListeners() {
    if (foregroundListenersBound || typeof window === "undefined") return;
    foregroundListenersBound = true;

    const mobile = isMobileDevice();

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            ensureConnected();
            emitHeartbeat();
        } else if (mobile) {
            // App switch / screen off — 5 min grace via socket + HTTP fallback.
            emitBackground();
            sendPresenceBackground();
        }
    });

    window.addEventListener("focus", () => {
        ensureConnected();
        emitHeartbeat();
    });
    window.addEventListener("online", ensureConnected);
    window.addEventListener("pageshow", () => {
        ensureConnected();
        emitHeartbeat();
    });
}

export function connectDriverSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (socket && socket.connected) return socket;

    const token = readAuthToken();
    if (!token) return null;

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
        console.log("[socket] driver connected:", socket?.id);
        emitHeartbeat();
        startHeartbeat();
    });

    socket.on("disconnect", (reason) => {
        console.log("[socket] driver disconnected:", reason);
        stopHeartbeat();
    });

    socket.on("connect_error", (err) => {
        console.warn("[socket] connect error:", err.message);
    });

    bindForegroundListeners();
    return socket;
}

function startHeartbeat() {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(() => {
        if (
            socket?.connected &&
            typeof document !== "undefined" &&
            document.visibilityState === "visible"
        ) {
            socket.emit("driver:heartbeat");
        }
    }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

export function disconnectDriverSocket() {
    stopHeartbeat();
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getDriverSocket(): Socket | null {
    return socket;
}

// Admin-app Socket.IO client.
//
// Connects to the /admin namespace and listens for live updates the
// backend broadcasts — most importantly `driver:presence` events when
// any driver goes online/offline. Components subscribe via
// `onAdminEvent(...)` and re-render their state on the fly.

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

let socket: Socket | null = null;
let foregroundListenersBound = false;

function readAuthToken(): string {
    if (typeof document === "undefined") return "";
    return (
        document.cookie
            .split("; ")
            .find((c) => c.startsWith("auth_token="))
            ?.split("=")[1] ?? ""
    );
}

export type DriverPresenceEvent = {
    userId: string;
    isOnline: boolean;
    lastSeenAt: string | null;
};

function ensureAdminConnected() {
    if (!socket) {
        connectAdminSocket();
        return;
    }
    if (!socket.connected) {
        console.log("[admin-socket] page active, reconnecting…");
        socket.connect();
    }
}

function bindAdminForegroundListeners() {
    if (foregroundListenersBound || typeof window === "undefined") return;
    foregroundListenersBound = true;

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") ensureAdminConnected();
    });
    window.addEventListener("focus", ensureAdminConnected);
    window.addEventListener("online", ensureAdminConnected);
    window.addEventListener("pageshow", ensureAdminConnected);
}

/** Connect to the /admin namespace. Idempotent — repeated calls reuse the same socket. */
export function connectAdminSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (socket && socket.connected) return socket;

    const token = readAuthToken();
    if (!token) return null;

    if (socket && !socket.connected) {
        socket.connect();
        bindAdminForegroundListeners();
        return socket;
    }

    socket = io(`${SOCKET_URL}/admin`, {
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
        console.log("[admin-socket] connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
        console.log("[admin-socket] disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
        console.warn("[admin-socket] connect error:", err.message);
    });

    bindAdminForegroundListeners();
    return socket;
}

/** Disconnect and clear the singleton. Called on logout. */
export function disconnectAdminSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Subscribe to `driver:presence` events. Returns an unsubscribe function.
 * Safe to call before the socket has connected — the listener is attached
 * to the singleton and persists across reconnects.
 */
export function onDriverPresence(
    handler: (event: DriverPresenceEvent) => void,
): () => void {
    const s = connectAdminSocket();
    if (!s) return () => { /* no socket — nothing to clean up */ };
    s.on("driver:presence", handler);
    return () => {
        s.off("driver:presence", handler);
    };
}

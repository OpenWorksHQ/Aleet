// Driver-app Socket.IO — real-time trip offers + availability heartbeats.
// AQD is driven by explicit Available/On-Call status, not socket connect.

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

function ensureConnected() {
    if (!socket) {
        connectDriverSocket();
        return;
    }
    if (!socket.connected) {
        socket.connect();
    }
}

function bindForegroundListeners() {
    if (foregroundListenersBound || typeof window === "undefined") return;
    foregroundListenersBound = true;

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            ensureConnected();
        }
    });
    window.addEventListener("focus", ensureConnected);
    window.addEventListener("online", ensureConnected);
    window.addEventListener("pageshow", ensureConnected);
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
    });

    socket.on("disconnect", (reason) => {
        console.log("[socket] driver disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
        console.warn("[socket] connect error:", err.message);
    });

    bindForegroundListeners();
    return socket;
}

export function disconnectDriverSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getDriverSocket(): Socket | null {
    return socket;
}

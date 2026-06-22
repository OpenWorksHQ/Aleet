"use client";

import { useEffect } from "react";
import { connectDriverSocket, disconnectDriverSocket } from "@/lib/socket";

/**
 * Mount-once component that opens the driver Socket.IO connection.
 * AQD presence is socket-driven: heartbeat, background, connect/disconnect.
 *
 * Lifecycle:
 *   - Mount   → connect socket (marks driver online)
 *   - Unmount → disconnect socket (short grace unless mobile background TTL)
 *   - Logout  → sendPresenceOffline() then disconnectDriverSocket()
 */
export function DriverPresenceSocket() {
    useEffect(() => {
        connectDriverSocket();
        return () => {
            disconnectDriverSocket();
        };
    }, []);

    return null;
}

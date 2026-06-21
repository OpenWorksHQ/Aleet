"use client";

import { useEffect } from "react";
import { connectDriverSocket, disconnectDriverSocket } from "@/lib/socket";

/**
 * Mount-once component that opens a Socket.IO connection for real-time
 * admin broadcasts. AQD presence is driven by HTTP + socket heartbeats
 * (lastSeenAt), not by socket connect/disconnect.
 *
 * Lifecycle:
 *   - Mount   → connect socket, bump lastSeenAt via server
 *   - Unmount → disconnect socket only (NOT logout — presence unchanged)
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

"use client";

import { useEffect } from "react";
import { connectDriverSocket, disconnectDriverSocket } from "@/lib/socket";

/**
 * Mount-once component that opens a Socket.IO connection to the backend
 * /drivers namespace whenever the driver layout is alive. The socket
 * connection itself is the AQD "online" signal — no toggle, no UI.
 *
 * Lifecycle:
 *   - Mount  → connect (backend flips driver.isOnline = true)
 *   - Unmount → disconnect (backend flips offline after 10s debounce)
 *   - Browser/tab/app close → disconnect (same)
 *   - Logout → handled where the cookie is cleared (also calls
 *     disconnectDriverSocket from there)
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

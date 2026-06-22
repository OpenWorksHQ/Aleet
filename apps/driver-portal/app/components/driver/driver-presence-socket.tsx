"use client";

import { useEffect } from "react";
import { connectDriverSocket, disconnectDriverSocket } from "@/lib/socket";

/**
 * Socket.IO connection for trip offers. Does not affect AQD on its own.
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

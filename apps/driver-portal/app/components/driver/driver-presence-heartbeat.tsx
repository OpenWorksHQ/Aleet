"use client";

import { useEffect } from "react";
import { sendPresenceHeartbeat } from "@/lib/presence-api";

/** HTTP keep-alive for AQD — independent of WebSocket state. */
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

/**
 * Sends POST /api/users/me/presence/heartbeat every 60 s while the driver
 * portal tab is open. Keeps lastSeenAt fresh for admin display. AQD uses
 * isOnline (session), not heartbeat timing — backgrounded drivers stay counted.
 */
export function DriverPresenceHeartbeat() {
  useEffect(() => {
    sendPresenceHeartbeat();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        sendPresenceHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        sendPresenceHeartbeat();
      }
    };
    const onVisible = () => {
      sendPresenceHeartbeat();
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, []);

  return null;
}

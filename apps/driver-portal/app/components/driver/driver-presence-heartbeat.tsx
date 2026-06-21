"use client";

import { useEffect } from "react";
import { sendPresenceHeartbeat, sendPresenceOfflineOnPageClose } from "@/lib/presence-api";

/** HTTP keep-alive for AQD — independent of WebSocket state. */
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

/**
 * Sends POST /api/users/me/presence/heartbeat every 60 s while visible.
 * On app background (visibility hidden) sends one heartbeat — keeps session
 * alive while switching to WhatsApp. On tab/browser close (pagehide) sends
 * offline so AQD drops even without tapping Logout.
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

    const onPageHide = (event: PageTransitionEvent) => {
      // persisted=true → page in bfcache (back button) — driver may return
      if (!event.persisted) {
        sendPresenceOfflineOnPageClose();
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}

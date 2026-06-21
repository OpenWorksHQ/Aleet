"use client";

import { useEffect, useRef } from "react";
import {
  sendPresenceHeartbeat,
  sendPresenceOfflineOnPageClose,
} from "@/lib/presence-api";

/** Foreground heartbeat — must be well under server foreground TTL (60s). */
const HEARTBEAT_INTERVAL_MS = 20 * 1000;

/** Wait before treating hidden as app-background (not browser close). */
const BACKGROUND_CONFIRM_MS = 3 * 1000;

/**
 * HTTP presence keep-alive for AQD.
 *
 * Server sliding presenceUntil:
 *   - Foreground → ~90s TTL (browser killed → AQD drops within ~90s)
 *   - Background (confirmed) → ~45min TTL (WhatsApp switch)
 *
 * On mobile close, visibility:hidden fires before pagehide and must NOT
 * extend a 45min TTL — we only send background after hidden persists 3s.
 */
export function DriverPresenceHeartbeat() {
  const closingRef = useRef(false);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearBackgroundTimer() {
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
    }

    sendPresenceHeartbeat({ background: false });

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !closingRef.current) {
        sendPresenceHeartbeat({ background: false });
      }
    }, HEARTBEAT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (closingRef.current) return;

      if (document.visibilityState === "hidden") {
        // Short TTL refresh immediately — do NOT use 45min background yet.
        sendPresenceHeartbeat({ background: false });

        clearBackgroundTimer();
        backgroundTimerRef.current = setTimeout(() => {
          backgroundTimerRef.current = null;
          if (closingRef.current) return;
          if (document.visibilityState === "hidden") {
            sendPresenceHeartbeat({ background: true });
          }
        }, BACKGROUND_CONFIRM_MS);
      } else {
        clearBackgroundTimer();
        sendPresenceHeartbeat({ background: false });
      }
    };

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      closingRef.current = true;
      clearBackgroundTimer();
      sendPresenceOfflineOnPageClose();
    };

    const onPageShow = () => {
      closingRef.current = false;
      clearBackgroundTimer();
      sendPresenceHeartbeat({ background: false });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", () => {
      if (!closingRef.current) sendPresenceHeartbeat({ background: false });
    });
    window.addEventListener("online", () => {
      if (!closingRef.current) sendPresenceHeartbeat({ background: false });
    });

    return () => {
      clearInterval(interval);
      clearBackgroundTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}

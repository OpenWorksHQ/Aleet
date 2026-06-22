"use client";

import { useEffect } from "react";
import {
  fetchMyAvailability,
  sendAvailabilityHeartbeat,
  type AvailabilityStatus,
} from "@/lib/availability-api";
import { getDriverSocket } from "@/lib/socket";
import { setActiveAvailabilityStatus } from "./driver-availability-toggle";

const HEARTBEAT_MS = 2 * 60 * 1000;

/**
 * Sends liveness heartbeats while the driver is Available or On-Call.
 * Runs even when the tab is hidden (Maps, calls, other apps).
 */
export function DriverAvailabilityHeartbeat() {
  useEffect(() => {
    let status: AvailabilityStatus = "off";
    let interval: ReturnType<typeof setInterval> | null = null;

    function ping() {
      if (status !== "available" && status !== "on_call") return;
      sendAvailabilityHeartbeat();
      const socket = getDriverSocket();
      if (socket?.connected) {
        socket.emit("driver:heartbeat");
      }
    }

    async function sync() {
      const data = await fetchMyAvailability();
      status = data?.status ?? "off";
      setActiveAvailabilityStatus(status);

      if (interval) clearInterval(interval);
      if (status === "available" || status === "on_call") {
        ping();
        interval = setInterval(ping, HEARTBEAT_MS);
      }
    }

    sync();
    const refresh = setInterval(sync, 30 * 1000);

    return () => {
      if (interval) clearInterval(interval);
      clearInterval(refresh);
    };
  }, []);

  return null;
}

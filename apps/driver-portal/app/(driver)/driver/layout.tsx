import type { ReactNode } from "react";
import { DriverSidebar } from "@/app/components/driver/driver-sidebar";
import { DriverHeader } from "@/app/components/driver/driver-header";
import { DriverAvailabilityBar } from "@/app/components/driver/driver-availability-toggle";
import { DriverStatusSync } from "@/app/components/driver/driver-status-sync";
import { DriverPresenceSocket } from "@/app/components/driver/driver-presence-socket";
import { DriverAvailabilityHeartbeat } from "@/app/components/driver/driver-availability-heartbeat";
import { DevDeleteAccountButton } from "@/app/components/driver/dev-delete-account-button";

export const metadata = {
    title: "Driver Portal — Aleet",
};

export default function DriverLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-page-bg text-text">
            <DriverStatusSync />
            <DriverPresenceSocket />
            <DriverAvailabilityHeartbeat />
            <DriverSidebar />
            <div className="flex flex-1 flex-col min-w-0">
                <DriverHeader />
                <DriverAvailabilityBar />
                <main className="flex-1 overflow-y-auto p-4 sm:p-8">
                    {children}
                </main>
            </div>
            <DevDeleteAccountButton />
        </div>
    );
}

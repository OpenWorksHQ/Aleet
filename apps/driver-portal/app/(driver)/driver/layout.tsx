import type { ReactNode } from "react";
import { DriverSidebar } from "@/app/components/driver/driver-sidebar";
import { DriverHeader } from "@/app/components/driver/driver-header";
import { DriverStatusSync } from "@/app/components/driver/driver-status-sync";
import { DriverPresenceSocket } from "@/app/components/driver/driver-presence-socket";
import { DriverPresenceHeartbeat } from "@/app/components/driver/driver-presence-heartbeat";
import { DevDeleteAccountButton } from "@/app/components/driver/dev-delete-account-button";

export const metadata = {
    title: "Driver Portal — Aleet",
};

export default function DriverLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-page-bg text-text">
            <DriverStatusSync />
            <DriverPresenceSocket />
            <DriverPresenceHeartbeat />
            <DriverSidebar />
            <div className="flex flex-1 flex-col">
                <DriverHeader />
                <main className="flex-1 overflow-y-auto p-6 sm:p-8">
                    {children}
                </main>
            </div>
            <DevDeleteAccountButton />
        </div>
    );
}

import { cn } from "@/lib/utils";
import type { DashboardRecentTrip } from "@/lib/admin-api";

type Trip = {
    id: string;
    driver: string;
    route: string;
    fare: number;
    status: "completed" | "in-progress" | "cancelled";
    statusLabel: string;
};

const statusStyles: Record<Trip["status"], string> = {
    completed: "bg-emerald-500/15 text-emerald-400",
    "in-progress": "bg-gold/15 text-gold",
    cancelled: "bg-red-500/15 text-red-400",
};

function normalizeStatus(status: string): Trip["status"] {
    const normalized = status.trim().toLowerCase();
    if (normalized === "completed") return "completed";
    if (normalized === "in progress" || normalized === "in-progress") return "in-progress";
    return "cancelled";
}

function mapTrips(trips: DashboardRecentTrip[]): Trip[] {
    return trips.map((trip) => ({
        id: trip.tripId,
        driver: trip.driver,
        route: trip.route,
        fare: trip.fare,
        status: normalizeStatus(trip.status),
        statusLabel: trip.status,
    }));
}

function fmtMoney(value: number): string {
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 2,
    })}`;
}

export function RecentTrips({ trips }: { trips: DashboardRecentTrip[] }) {
    const rows = mapTrips(trips);

    return (
        <div className="min-w-0 rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
            <h2 className="mb-5 text-base font-semibold text-text">Recent Trips</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-xs text-muted">
                            <th className="pb-3 pr-4 font-medium">Trip ID</th>
                            <th className="pb-3 pr-4 font-medium">Driver</th>
                            <th className="pb-3 pr-4 font-medium">Route</th>
                            <th className="pb-3 pr-4 font-medium">Fare</th>
                            <th className="pb-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-sm text-muted">
                                    No recent trips.
                                </td>
                            </tr>
                        )}
                        {rows.map((trip) => (
                            <tr key={trip.id} className="border-b border-border/50 last:border-0">
                                <td className="py-3 pr-4 font-mono text-xs text-muted">{trip.id}</td>
                                <td className="py-3 pr-4 text-text">{trip.driver}</td>
                                <td className="py-3 pr-4 text-muted">
                                    <span className="flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
                                        {trip.route}
                                    </span>
                                </td>
                                <td className="py-3 pr-4 font-medium text-gold">{fmtMoney(trip.fare)}</td>
                                <td className="py-3">
                                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusStyles[trip.status])}>
                                        {trip.statusLabel}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

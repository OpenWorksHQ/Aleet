import type { BookingStats } from "@/lib/admin-api";

type Props = { stats: BookingStats };

export function TripsStats({ stats }: Props) {
    const items = [
        { label: "Total Trips", value: stats.totalTrips },
        { label: "Pending", value: stats.pending },
        { label: "Confirmed", value: stats.confirmed },
        { label: "In Progress", value: stats.inProgress },
        { label: "Total Value", value: `$${stats.totalValue.toFixed(2)}` },
        { label: "Unassigned", value: stats.unassigned },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {items.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-text">{s.value}</p>
                </div>
            ))}
        </div>
    );
}

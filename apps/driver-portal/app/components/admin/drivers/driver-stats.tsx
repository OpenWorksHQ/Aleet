import { cn } from "@/lib/utils";
import type { ApiDriversStats } from "@/lib/drivers-api";

type Props = { stats: ApiDriversStats };

export function DriverStats({ stats }: Props) {
    const items = [
        { label: "Total Drivers", value: stats.total, cls: "text-text" },
        { label: "Approved", value: stats.approved, cls: "text-emerald-400" },
        { label: "Pending Approval", value: stats.pending, cls: "text-gold" },
        { label: "Rejected", value: stats.rejected, cls: "text-red-400" },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {items.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card-bg px-5 py-4">
                    <p className="mb-1 text-xs text-muted">{s.label}</p>
                    <p className={cn("text-2xl font-bold", s.cls)}>{s.value}</p>
                </div>
            ))}
        </div>
    );
}

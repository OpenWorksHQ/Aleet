import { cn } from "@/lib/utils";

type StatCardProps = {
    title: string;
    value: string;
    change: string;
    changeLabel: string;
    positive?: boolean;
    icon: React.ReactNode;
};

export function StatCard({ title, value, change, changeLabel, positive = true, icon }: StatCardProps) {
    return (
        <div className="min-w-0 rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
                <span className="text-gold shrink-0">{icon}</span>
                <span className="min-w-0 truncate">{title}</span>
            </div>
            <p className="mb-1 truncate text-2xl font-bold text-text sm:text-3xl">{value}</p>
            <p className={cn("text-xs font-medium", positive ? "text-emerald-400" : "text-red-400")}>
                {change}{" "}
                <span className="text-muted font-normal">{changeLabel}</span>
            </p>
        </div>
    );
}

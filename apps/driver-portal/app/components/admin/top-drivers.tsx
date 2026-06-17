import type { DashboardTopDriver } from "@/lib/admin-api";

type Driver = {
    rank: number;
    name: string;
    trips: number;
    rating: number;
    earnings: number;
};

function mapDrivers(drivers: DashboardTopDriver[]): Driver[] {
    return drivers.map((driver) => ({
        rank: driver.rank,
        name: driver.name,
        trips: driver.trips,
        rating: driver.rating,
        earnings: driver.earnings,
    }));
}

function fmtMoney(value: number): string {
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

export function TopDrivers({ drivers }: { drivers: DashboardTopDriver[] }) {
    const rows = mapDrivers(drivers);

    return (
        <div className="min-w-0 rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
            <h2 className="mb-5 text-base font-semibold text-text">Top Performing Drivers</h2>
            <div className="flex flex-col gap-3">
                {rows.length === 0 && (
                    <div className="rounded-xl border border-border/60 px-4 py-4 text-sm text-muted">
                        No top drivers yet.
                    </div>
                )}
                {rows.map((driver) => (
                    <div key={driver.rank} className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
                        {/* Rank badge */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                            {driver.rank}
                        </div>

                        {/* Name & stats */}
                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                            <span className="truncate text-sm font-medium text-text">{driver.name}</span>
                            <span className="text-xs text-muted">
                                {driver.trips} trips &nbsp;·&nbsp; ⭐ {driver.rating}
                            </span>
                        </div>

                        {/* Earnings */}
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-sm font-semibold text-gold">{fmtMoney(driver.earnings)}</span>
                            <span className="text-[11px] text-muted">This month</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

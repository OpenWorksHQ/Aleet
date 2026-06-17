"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
    TIER_LABELS,
    TIER_COLORS,
    TIER_ICON_COLORS,
    type DriverTierLevel,
} from "./tier-types";
import type { ApiTierDriver, TierCounts, TierPerformancePage, TierSettings } from "@/lib/admin-api";
import { fetchTierPerformanceClient } from "@/lib/admin-api";
import { TierSettingsModal } from "./tier-settings-modal";

const ALL = "all" as const;
type Filter = DriverTierLevel | typeof ALL;

const FILTERS: { key: Filter; label: string }[] = [
    { key: ALL, label: "All" },
    { key: "S-Level", label: "S-Level" },
    { key: "Pro", label: "Pro" },
    { key: "Diamond", label: "Diamond" },
];

const TIER_KEYS: DriverTierLevel[] = ["S-Level", "Pro", "Diamond"];

function getTierDescription(tier: DriverTierLevel, settings: TierSettings | null): string {
    if (!settings) return "Loading…";
    const policy = settings.tiers[tier];
    const pct = Math.round(policy.payoutRate * 100);
    const fee = policy.keepsBookingFee ? ` + $${settings.bookingFee} booking fee` : " · platform keeps fee";
    return `${pct}% payout${fee}`;
}

const TIER_ICONS: Record<DriverTierLevel, React.ReactNode> = {
    "S-Level": (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    Pro: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
    ),
    Diamond: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M2.7 10.3 12 21l9.3-10.7L16 3H8L2.7 10.3z" /><path d="M8 3l4 8 4-8" /><path d="M2.7 10.3H21.3" />
        </svg>
    ),
};

const LIMIT = 20;
// grid: [name 1fr] [tier 160px] [rating 160px] [trips 120px] [earnings 140px]
const GRID = "grid-cols-[1fr_160px_160px_120px_140px]";

type Props = {
    initialDrivers: ApiTierDriver[];
    initialTierCounts: TierCounts;
    initialPagination: TierPerformancePage["pagination"];
    initialSettings: TierSettings | null;
};

export function TiersList({ initialDrivers, initialTierCounts, initialPagination, initialSettings }: Props) {
    const [drivers, setDrivers] = useState<ApiTierDriver[]>(initialDrivers);
    const [tierCounts, setTierCounts] = useState<TierCounts>(initialTierCounts);
    const [pagination, setPagination] = useState(initialPagination);
    const [filter, setFilter] = useState<Filter>(ALL);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<TierSettings | null>(initialSettings);

    function load(params: { tier?: DriverTierLevel; page: number }) {
        setError(null);
        startTransition(async () => {
            try {
                const result = await fetchTierPerformanceClient({
                    tier: params.tier,
                    page: params.page,
                    limit: LIMIT,
                });
                setDrivers(result.drivers);
                setTierCounts(result.tierCounts);
                setPagination(result.pagination);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
            }
        });
    }

    function handleFilterChange(f: Filter) {
        setFilter(f);
        setPage(1);
        load({ tier: f === ALL ? undefined : f, page: 1 });
    }

    function handlePageChange(newPage: number) {
        setPage(newPage);
        load({ tier: filter === ALL ? undefined : filter, page: newPage });
    }

    return (
        <>
            <TierSettingsModal
                open={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={(updated) => setSettings(updated)}
            />

            <div className="flex flex-col gap-4">
                {/* Tier stat cards */}
                <div className="grid grid-cols-3 gap-3">
                    {TIER_KEYS.map((tier) => (
                        <div key={tier} className="rounded-2xl border border-border bg-card-bg p-4 sm:p-5">
                            <div className={cn("mb-4 flex items-center gap-2 font-bold", TIER_ICON_COLORS[tier])}>
                                {TIER_ICONS[tier]}
                                <span className="text-base">{TIER_LABELS[tier]}</span>
                            </div>
                            <p className="text-3xl font-bold text-text">{tierCounts[tier]}</p>
                            <p className="mt-1 text-xs text-muted">{getTierDescription(tier, settings)}</p>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card-bg">
                    {/* Heading + settings button */}
                    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <div>
                            <h2 className="text-base font-bold text-text">Driver Tier Performance</h2>
                            <p className="mt-0.5 text-xs text-muted">Overview of drivers across all tiers</p>
                        </div>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            Tier Settings
                        </button>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => handleFilterChange(f.key)}
                                className={cn(
                                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                    filter === f.key
                                        ? "border-gold/60 bg-gold/10 text-gold"
                                        : "border-border text-muted hover:border-border/80 hover:text-text",
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <p className="px-5 py-3 text-sm text-red-400">{error}</p>
                    )}

                    {/* Column header */}
                    <div className={cn("hidden lg:grid items-center gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted", GRID)}>
                        <span>Driver Name</span>
                        <span>Tier</span>
                        <span className="text-center">Rating</span>
                        <span className="text-right">Total Trips</span>
                        <span className="text-right">Total Earnings</span>
                    </div>

                    {/* Rows */}
                    <div className={cn("flex flex-col divide-y divide-border transition-opacity", isPending && "pointer-events-none opacity-50")}>
                        {drivers.length === 0 && !isPending && (
                            <div className="py-16 text-center text-sm text-muted">No drivers found.</div>
                        )}
                        {drivers.map((driver) => (
                            <div key={driver._id} className="transition-colors hover:bg-white/2">
                                {/* Desktop */}
                                <div className={cn("hidden lg:grid items-center gap-4 px-5 py-3", GRID)}>
                                    <p className="truncate text-sm text-text">{driver.name}</p>
                                    <div>
                                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", TIER_COLORS[driver.tier])}>
                                            {TIER_LABELS[driver.tier]}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-gold" stroke="none">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        <span className="text-sm text-text">{driver.rating.toFixed(1)}</span>
                                    </div>
                                    <p className="text-right text-sm text-text">{driver.totalTrips.toLocaleString()}</p>
                                    <p className="text-right text-sm font-semibold text-gold">${driver.totalEarnings.toLocaleString()}</p>
                                </div>

                                {/* Mobile */}
                                <div className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-text">{driver.name}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", TIER_COLORS[driver.tier])}>
                                                {TIER_LABELS[driver.tier]}
                                            </span>
                                            <span className="flex items-center gap-0.5 text-xs text-muted">
                                                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-gold" stroke="none">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                                {driver.rating.toFixed(1)}
                                            </span>
                                            <span className="text-xs text-muted">{driver.totalTrips} trips</span>
                                        </div>
                                    </div>
                                    <p className="shrink-0 text-sm font-bold text-gold">${driver.totalEarnings.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
                            <span>{pagination.total} drivers</span>
                            <div className="flex gap-1.5">
                                <button
                                    disabled={page <= 1 || isPending}
                                    onClick={() => handlePageChange(page - 1)}
                                    className="rounded-lg border border-border px-2.5 py-1 transition-colors hover:text-text disabled:opacity-40"
                                >
                                    ‹ Prev
                                </button>
                                <span className="flex items-center px-2">
                                    {page} / {pagination.totalPages}
                                </span>
                                <button
                                    disabled={page >= pagination.totalPages || isPending}
                                    onClick={() => handlePageChange(page + 1)}
                                    className="rounded-lg border border-border px-2.5 py-1 transition-colors hover:text-text disabled:opacity-40"
                                >
                                    Next ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}


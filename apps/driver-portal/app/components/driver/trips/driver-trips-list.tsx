"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    fetchDriverDashboardTripsClient,
    acceptTripClient,
    cancelTripClient,
    type DriverDashboardTrip,
    type DriverDashboardTripsResponse,
    type DriverTripsTab,
} from "@/lib/driver-dashboard-trips-api";

type TabKey = DriverTripsTab;

type Props = {
    initialData: DriverDashboardTripsResponse;
};

const LIMIT = 20;

function fmtDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fmtTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatCurrency(value: number) {
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function compactId(id: string) {
    if (!id) return "—";
    return `#${id.slice(-8).toUpperCase()}`;
}

function normalizeStatus(status: string): string {
    return status.trim().toLowerCase().replace(/\s+/g, "_");
}

function getStatusLabel(status: string): string {
    const normalized = normalizeStatus(status);
    const labels: Record<string, string> = {
        pending: "Available",
        available: "Available",
        accepted: "Accepted",
        confirmed: "Accepted",
        in_progress: "In Progress",
        completed: "Completed",
        cancelled: "Cancelled",
        rejected: "Cancelled",
        expired: "Expired",
    };
    return labels[normalized] ?? (status || "Unknown");
}

function getStatusClass(status: string): string {
    const normalized = normalizeStatus(status);
    const classes: Record<string, string> = {
        pending: "border-sky-500/40 bg-sky-500/10 text-sky-400",
        available: "border-sky-500/40 bg-sky-500/10 text-sky-400",
        accepted: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        confirmed: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        in_progress: "border-violet-500/40 bg-violet-500/10 text-violet-400",
        completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        cancelled: "border-red-500/40 bg-red-500/10 text-red-400",
        rejected: "border-red-500/40 bg-red-500/10 text-red-400",
        expired: "border-border bg-border/20 text-muted",
    };
    return classes[normalized] ?? "border-border bg-border/20 text-muted";
}

function isAvailableTabTrip(trip: DriverDashboardTrip): boolean {
    const normalized = normalizeStatus(trip.status);
    return normalized === "pending" || normalized === "available";
}

function isCancellableTrip(trip: DriverDashboardTrip): boolean {
    const normalized = normalizeStatus(trip.status);
    return (
        normalized === "confirmed" ||
        normalized === "accepted" ||
        normalized === "in_progress"
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color?: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card-bg p-5 flex items-center gap-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color ?? "bg-gold/10")}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted">{label}</p>
                <p className="text-2xl font-bold text-text">{value}</p>
            </div>
        </div>
    );
}

export function DriverTripsList({ initialData }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>("available");
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DriverDashboardTripsResponse>(initialData);
    const [page, setPage] = useState(initialData.pagination.page || 1);
    const [actionTripId, setActionTripId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const tabs: { key: TabKey; label: string; count: number }[] = useMemo(
        () => [
            { key: "available", label: "Available Trips", count: data.stats.availableTrips },
            { key: "mine", label: "My Trips", count: data.stats.myTrips },
            { key: "history", label: "History", count: data.stats.completed },
        ],
        [data.stats.availableTrips, data.stats.completed, data.stats.myTrips],
    );

    async function loadTrips(next: { tab: TabKey; search: string; page: number }) {
        setIsLoading(true);
        setError(null);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const result = await fetchDriverDashboardTripsClient({
                tab: next.tab,
                search: next.search || undefined,
                page: next.page,
                limit: LIMIT,
            }, controller.signal);
            if (!controller.signal.aborted) {
                setData(result);
            }
        } catch (e) {
            if (!controller.signal.aborted) {
                setError(e instanceof Error ? e.message : "Failed to load trips");
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    }

    function handleTabChange(tab: TabKey) {
        setActiveTab(tab);
        setExpanded(null);
        setPage(1);
        loadTrips({ tab, search: appliedSearch, page: 1 });
    }

    function handleSearch() {
        const nextSearch = searchInput.trim();
        setAppliedSearch(nextSearch);
        setExpanded(null);
        setPage(1);
        loadTrips({ tab: activeTab, search: nextSearch, page: 1 });
    }

    function handlePageChange(nextPage: number) {
        setPage(nextPage);
        setExpanded(null);
        loadTrips({ tab: activeTab, search: appliedSearch, page: nextPage });
    }

    function handleRefresh() {
        setExpanded(null);
        loadTrips({ tab: activeTab, search: appliedSearch, page });
    }

    function clearActionStatus() {
        setActionError(null);
        setActionSuccess(null);
    }

    async function handleAccept(tripId: string) {
        clearActionStatus();
        setActionTripId(tripId);
        try {
            await acceptTripClient(tripId);
            setActionSuccess("Trip accepted — check 'My Trips' for details.");
            await loadTrips({ tab: activeTab, search: appliedSearch, page });
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Failed to accept trip");
        } finally {
            setActionTripId(null);
        }
    }

    async function handleCancel(tripId: string) {
        const ok = typeof window !== "undefined"
            ? window.confirm("Cancel this trip? It will return to the dispatch pool so the admin can reassign.")
            : true;
        if (!ok) return;
        clearActionStatus();
        setActionTripId(tripId);
        try {
            await cancelTripClient(tripId);
            setActionSuccess("Trip cancelled — admin will reassign.");
            await loadTrips({ tab: activeTab, search: appliedSearch, page });
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Failed to cancel trip");
        } finally {
            setActionTripId(null);
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-sky-400">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="2.5" />
                        </svg>
                    }
                    label="Available Trips"
                    value={data.stats.availableTrips}
                    color="bg-sky-500/10"
                />
                <StatCard
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-400">
                            <path d="M22 16.92V19a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 9.81 19.79 19.79 0 0 1 1 1.18 2 2 0 0 1 3 0h2.09" />
                            <polyline points="12 5 19 12 22 9" />
                        </svg>
                    }
                    label="My Trips"
                    value={data.stats.myTrips}
                    color="bg-amber-500/10"
                />
                <StatCard
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-400">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    }
                    label="Completed"
                    value={data.stats.completed}
                    color="bg-emerald-500/10"
                />
                <StatCard
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gold">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    }
                    label="Total Earnings"
                    value={formatCurrency(data.stats.totalEarnings)}
                    color="bg-gold/10"
                />
            </div>

            {/* Search bar */}
            <div className="rounded-2xl border border-border bg-card-bg p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-muted">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <p className="text-sm font-semibold text-text">Search Trips</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/40 hover:text-gold"
                    >
                        Refresh
                    </button>
                </div>
                <div className="mt-3 flex gap-3">
                    <div className="relative flex-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by pickup or dropoff location..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSearch();
                            }}
                            className="w-full rounded-xl border border-border bg-page-bg py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold/90"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        Search
                    </button>
                </div>
            </div>

            {/* Tabs + list */}
            <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                <div className="grid grid-cols-3 border-b border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={cn(
                                "py-3 text-sm font-medium transition-colors",
                                activeTab === tab.key
                                    ? "border-b-2 border-gold text-gold"
                                    : "text-muted hover:text-text",
                            )}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="border-b border-border px-5 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {actionError && (
                    <div className="border-b border-border bg-red-500/5 px-5 py-3 text-sm text-red-400">
                        {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="border-b border-border bg-emerald-500/5 px-5 py-3 text-sm text-emerald-400">
                        {actionSuccess}
                    </div>
                )}

                <div className={cn("flex flex-col divide-y divide-border", isLoading && "opacity-60")}>
                    {!isLoading && data.trips.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-muted">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                <circle cx="12" cy="9" r="2.5" />
                            </svg>
                            <p className="text-sm text-muted">No trips found for current filters.</p>
                        </div>
                    )}

                    {data.trips.map((trip) => {
                        const isExpanded = expanded === trip.id;
                        const hasDiscount = trip.originalEarnings > trip.driverEarnings;
                        const statusLabel = getStatusLabel(trip.status);
                        const statusClass = getStatusClass(trip.status);

                        return (
                            <div key={trip.id}>
                                <div
                                    className={cn(
                                        "px-5 py-4 transition-colors hover:bg-white/2 cursor-pointer",
                                        isExpanded && "bg-white/2",
                                    )}
                                    onClick={() => setExpanded(isExpanded ? null : trip.id)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", statusClass)}>
                                                    {statusLabel}
                                                </span>
                                                <span className="text-sm text-muted">{compactId(trip.id)}</span>
                                            </div>
                                            <p className="text-sm font-medium text-text truncate">
                                                {trip.pickupLocation}{" "}
                                                <span className="text-muted">→</span>{" "}
                                                {trip.dropoffLocation}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted">
                                                {trip.region?.name ?? "—"} {trip.region?.code ? `(${trip.region.code})` : ""}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                                                <div className="flex items-center gap-1.5">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span className="text-xs font-medium text-text">{fmtDate(trip.startDate)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span className="text-xs text-text">
                                                        {fmtTime(trip.startDate)} – {fmtTime(trip.endDate)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted">
                                                        <rect x="1" y="3" width="15" height="13" rx="1" />
                                                        <path d="M16 8h4l3 5v3h-7V8z" />
                                                        <circle cx="5.5" cy="18.5" r="2.5" />
                                                        <circle cx="18.5" cy="18.5" r="2.5" />
                                                    </svg>
                                                    <span className="text-xs text-text">{trip.vehicleType} × {trip.quantity}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 shrink-0">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-emerald-400">
                                                        {formatCurrency(trip.driverEarnings)}
                                                    </p>
                                                    <p className="text-xs text-muted">Trip earnings</p>
                                                    {hasDiscount && (
                                                        <p className="text-xs text-muted line-through">
                                                            {formatCurrency(trip.originalEarnings)}
                                                        </p>
                                                    )}
                                                </div>
                                                {activeTab === "available" && isAvailableTabTrip(trip) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAccept(trip.id);
                                                        }}
                                                        disabled={actionTripId !== null}
                                                        className="rounded-xl bg-gold px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {actionTripId === trip.id ? "Accepting…" : "Accept Trip"}
                                                    </button>
                                                )}
                                                {activeTab === "mine" && isCancellableTrip(trip) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancel(trip.id);
                                                        }}
                                                        disabled={actionTripId !== null}
                                                        className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {actionTripId === trip.id ? "Cancelling…" : "Cancel"}
                                                    </button>
                                                )}
                                            </div>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                className={cn("h-4 w-4 mt-1 text-muted transition-transform", isExpanded && "rotate-180")}>
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-border bg-white/1 px-5 pb-5 pt-4">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                                            <div>
                                                <p className="text-xs text-muted">Region</p>
                                                <p className="text-sm text-text">
                                                    {trip.region?.name ?? "—"} {trip.region?.code ? `(${trip.region.code})` : ""}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Trip Type</p>
                                                <p className="text-sm text-text">
                                                    {trip.isMembershipTrip ? "Membership" : "Standard"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Quantity</p>
                                                <p className="text-sm text-text">{trip.quantity}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Schedule</p>
                                                <p className="text-sm text-text">
                                                    {fmtDate(trip.startDate)} · {fmtTime(trip.startDate)} – {fmtTime(trip.endDate)}
                                                </p>
                                            </div>
                                        </div>

                                        {trip.stops.length > 0 && (
                                            <div className="mt-4">
                                                <p className="mb-2 text-xs font-medium text-muted">Stops</p>
                                                <ol className="space-y-2">
                                                    {trip.stops.map((stop, i) => (
                                                        <li key={i} className="flex gap-3">
                                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-semibold text-gold">
                                                                {i + 1}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm text-text">{stop.location}</p>
                                                                <p className="text-xs text-muted">
                                                                    {stop.arrivalTime
                                                                        ? `${stop.timeType === "pickup" ? "Pickup" : "Arrive"} ${fmtTime(stop.arrivalTime)}`
                                                                        : stop.timeType === "pickup" ? "Pickup" : "Arrival"}
                                                                    {stop.dwellMinutes > 0 ? ` · ${stop.dwellMinutes} min stop` : ""}
                                                                </p>
                                                                {stop.notes && (
                                                                    <p className="mt-0.5 text-xs italic text-amber-300/90">{stop.notes}</p>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}

                                        {trip.specialNotes && (
                                            <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                                                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-300">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                        <line x1="12" y1="9" x2="12" y2="13" />
                                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                                    </svg>
                                                    Special Notes
                                                </p>
                                                <p className="text-sm whitespace-pre-line text-text">{trip.specialNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
                    <span>
                        Showing {data.trips.length} of {data.pagination.total}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            disabled={isLoading || page <= 1}
                            className="rounded-lg border border-border px-2.5 py-1 transition-colors hover:text-text disabled:opacity-40"
                        >
                            ‹ Prev
                        </button>
                        <span className="px-2">
                            {page} / {data.pagination.totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(Math.min(data.pagination.totalPages, page + 1))}
                            disabled={isLoading || page >= data.pagination.totalPages}
                            className="rounded-lg border border-border px-2.5 py-1 transition-colors hover:text-text disabled:opacity-40"
                        >
                            Next ›
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

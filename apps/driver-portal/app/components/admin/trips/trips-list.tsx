"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    STATUS_LABELS,
    STATUS_COLORS,
    PAYMENT_COLORS,
} from "./trip-types";
import type { ApiBooking, ApiBookingStatus, BookingsPage, EligibleDriver } from "@/lib/admin-api";
import {
    fetchBookingsClient,
    fetchEligibleDrivers,
    assignDriverToBooking,
    redispatchBooking,
    unassignDriverFromBooking,
} from "@/lib/admin-api";

const LIMIT = 10;

const FILTERS: { key: ApiBookingStatus | ""; label: string }[] = [
    { key: "", label: "All" },
    { key: "Pending", label: "Pending" },
    { key: "Confirmed", label: "Confirmed" },
    { key: "In Progress", label: "In Progress" },
    { key: "Completed", label: "Completed" },
    { key: "Cancelled", label: "Cancelled" },
    { key: "Expired", label: "Expired" },
];

// Fluid columns — every track is minmax(0,fr) so the grid always fits the
// container width (no horizontal scroll) and cells truncate when space is tight.
// Order: [status/id] [route] [date] [vehicle] [customer] [driver] [price] [chevron]
const GRID =
    "grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_24px]";

function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function shortId(id: string) {
    return `#${id.slice(-8).toUpperCase()}`;
}

function fmtBookingMode(mode: string) {
    return mode === "multi_day" ? "Multi-day" : "Buy hours";
}

type Props = {
    initialBookings: ApiBooking[];
    initialPagination: BookingsPage["pagination"];
};

// ── Assign Driver panel ─────────────────────────────────────────────────────
// Fetches the tier-ranked eligible-driver list for a booking and lets the
// admin assign one. Eligible drivers come first; ineligible ones show why.
function AssignDriverPanel({
    bookingId,
    onAssigned,
}: {
    bookingId: string;
    onAssigned: (driver: { _id: string; name: string }) => void;
}) {
    // Result is tagged with bookingId so a stale fetch from a previous prop
    // value is simply ignored — keeps the effect free of sync setState calls.
    type Loaded = {
        key: string;
        drivers: EligibleDriver[];
        meta: { sameDay: boolean; membershipTrip: boolean } | null;
        error: string | null;
    };
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<string | null>(null);

    const fresh = loaded?.key === bookingId;
    const loading = !fresh;
    const drivers = fresh ? loaded!.drivers : [];
    const meta = fresh ? loaded!.meta : null;
    const fetchError = fresh ? loaded!.error : null;
    const error = assignError ?? fetchError;

    useEffect(() => {
        let cancelled = false;
        fetchEligibleDrivers(bookingId)
            .then((res) => {
                if (cancelled) return;
                setLoaded({
                    key: bookingId,
                    drivers: res.drivers,
                    meta: { sameDay: res.sameDay, membershipTrip: res.membershipTrip },
                    error: null,
                });
            })
            .catch((e) => {
                if (cancelled) return;
                setLoaded({
                    key: bookingId,
                    drivers: [],
                    meta: null,
                    error: e instanceof Error ? e.message : "Failed to load drivers",
                });
            });
        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    async function handleAssign(d: EligibleDriver) {
        setAssigningId(d._id);
        setAssignError(null);
        try {
            await assignDriverToBooking(bookingId, d._id);
            onAssigned({ _id: d._id, name: d.name });
        } catch (e) {
            setAssignError(e instanceof Error ? e.message : "Failed to assign driver");
            setAssigningId(null);
        }
    }

    const eligible = drivers.filter((d) => d.eligible);
    const ineligible = drivers.filter((d) => !d.eligible);

    return (
        <div className="mt-3 rounded-xl border border-border bg-page-bg/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-semibold text-text">Assign a driver</p>
                {meta && (
                    <span className="text-[11px] text-muted">
                        {meta.sameDay ? "Same-day" : "Advance"} booking
                        {meta.membershipTrip ? " · Membership" : ""}
                    </span>
                )}
            </div>

            {loading && <p className="py-3 text-center text-xs text-muted">Loading eligible drivers…</p>}
            {error && <p className="py-2 text-xs text-red-400">{error}</p>}

            {!loading && !error && eligible.length === 0 && (
                <p className="py-3 text-center text-xs text-muted">No eligible drivers for this booking.</p>
            )}

            {!loading && eligible.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {eligible.map((d) => (
                        <div key={d._id} className="flex items-center gap-2 rounded-lg border border-border bg-card-bg px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-text">{d.name}</p>
                                <p className="truncate text-[11px] text-muted">
                                    {d.tier ?? "—"} · ⭐ {d.rating.toFixed(1)}
                                </p>
                            </div>
                            <button
                                onClick={() => handleAssign(d)}
                                disabled={assigningId !== null}
                                className="shrink-0 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {assigningId === d._id ? "Assigning…" : "Assign"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && ineligible.length > 0 && (
                <div className="mt-2">
                    <p className="mb-1 text-[11px] text-muted">Not eligible ({ineligible.length})</p>
                    <div className="flex flex-col gap-1">
                        {ineligible.map((d) => (
                            <div key={d._id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 opacity-60">
                                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                                    {d.name} · {d.tier ?? "—"}
                                </span>
                                <span className="shrink-0 text-[11px] text-red-400/70">{d.reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function TripsList({ initialBookings, initialPagination }: Props) {
    const [bookings, setBookings] = useState<ApiBooking[]>(initialBookings);
    const [pagination, setPagination] = useState(initialPagination);
    const [status, setStatus] = useState<ApiBookingStatus | "">("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [assignOpen, setAssignOpen] = useState<string | null>(null);
    const [actionBookingId, setActionBookingId] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstMount = useRef(true);

    const load = (opts: { status: ApiBookingStatus | ""; search: string; page: number }) => {
        startTransition(async () => {
            setError(null);
            try {
                const result = await fetchBookingsClient({
                    ...(opts.status ? { status: opts.status } : {}),
                    ...(opts.search ? { search: opts.search } : {}),
                    page: opts.page,
                    limit: LIMIT,
                    sortBy: "createdAt",
                    order: "desc",
                });
                setBookings(result.bookings);
                setPagination(result.pagination);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load bookings");
            }
        });
    };

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        setPage(1);
        load({ status, search, page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    useEffect(() => {
        if (isFirstMount.current) return;
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setPage(1);
            load({ status, search, page: 1 });
        }, 400);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (isFirstMount.current) return;
        load({ status, search, page });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleStatusChange = (key: ApiBookingStatus | "") => {
        setExpanded(null);
        setStatus(key);
    };

    const patchBooking = (id: string, patch: Partial<ApiBooking>) => {
        setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, ...patch } : b)));
    };

    async function handleRedispatch(bookingId: string) {
        setActionBookingId(bookingId);
        setActionMessage(null);
        try {
            const result = await redispatchBooking(bookingId);
            const tierLabel = result.tiers.length > 0 ? result.tiers.join(" + ") : "none";
            setActionMessage({
                kind: "ok",
                text: `Re-dispatched to ${tierLabel} (stage ${result.stage}) — ${result.driversNotified} driver${result.driversNotified === 1 ? "" : "s"} notified.`,
            });
        } catch (e) {
            setActionMessage({
                kind: "err",
                text: e instanceof Error ? e.message : "Failed to re-dispatch booking",
            });
        } finally {
            setActionBookingId(null);
        }
    }

    async function handleUnassign(bookingId: string) {
        const ok = typeof window !== "undefined"
            ? window.confirm("Unassign the current driver? The booking will return to Pending.")
            : true;
        if (!ok) return;
        setActionBookingId(bookingId);
        setActionMessage(null);
        try {
            await unassignDriverFromBooking(bookingId);
            patchBooking(bookingId, { assignedDriver: null, status: "Pending" });
            setActionMessage({ kind: "ok", text: "Driver unassigned — booking is back to Pending." });
        } catch (e) {
            setActionMessage({
                kind: "err",
                text: e instanceof Error ? e.message : "Failed to unassign driver",
            });
        } finally {
            setActionBookingId(null);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Search + filter bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card-bg p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by location, customer…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-border bg-page-bg py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => handleStatusChange(f.key)}
                            className={cn(
                                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                status === f.key
                                    ? "border-gold/60 bg-gold/10 text-gold"
                                    : "border-border text-muted hover:border-border/80 hover:text-text",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                {/* Header */}
                <div className={cn("hidden xl:grid items-center gap-3 border-b border-border px-4 py-2.5", GRID)}>
                    <span className="text-xs font-medium text-muted">Status / ID</span>
                    <span className="text-xs font-medium text-muted">Route</span>
                    <span className="text-xs font-medium text-muted">Date & Time</span>
                    <span className="text-xs font-medium text-muted">Vehicle</span>
                    <span className="text-xs font-medium text-muted">Customer</span>
                    <span className="text-xs font-medium text-muted">Driver</span>
                    <span className="text-xs font-medium text-muted text-right">Price</span>
                    <span />
                </div>

                {/* Count row */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                    <span className="text-xs text-muted">
                        {isPending ? "Loading…" : `Showing ${bookings.length} of ${pagination.total} booking${pagination.total !== 1 ? "s" : ""}`}
                    </span>
                    {error && <span className="text-xs text-red-400">{error}</span>}
                </div>

                {actionMessage && (
                    <div
                        className={cn(
                            "border-b border-border px-4 py-2 text-xs",
                            actionMessage.kind === "ok"
                                ? "bg-emerald-500/5 text-emerald-400"
                                : "bg-red-500/5 text-red-400",
                        )}
                    >
                        {actionMessage.text}
                    </div>
                )}

                {!isPending && bookings.length === 0 && (
                    <div className="py-16 text-center text-sm text-muted">
                        No bookings match your filters.
                    </div>
                )}

                <div className={cn("flex flex-col divide-y divide-border", isPending && "opacity-50 pointer-events-none")}>
                    {bookings.map((booking) => {
                        const isExpanded = expanded === booking._id;
                        const hasSavings = booking.savings > 0;
                        const addonTotal = booking.addOns.reduce((s, a) => s + a.price, 0);

                        return (
                            <div key={booking._id}>
                                {/* Main row */}
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : booking._id)}
                                    className={cn(
                                        "w-full text-left transition-colors hover:bg-white/2",
                                        isExpanded && "bg-white/2",
                                    )}
                                >
                                    {/* Desktop grid row */}
                                    <div className={cn("hidden xl:grid items-center gap-3 px-4 py-3", GRID)}>
                                        {/* Status + payment + ID */}
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", STATUS_COLORS[booking.status])}>
                                                    {STATUS_LABELS[booking.status]}
                                                </span>
                                                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", PAYMENT_COLORS[booking.paymentStatus])}>
                                                    {booking.paymentStatus}
                                                </span>
                                            </div>
                                            <span className="truncate text-[11px] font-medium tracking-wide text-muted">{shortId(booking._id)}</span>
                                        </div>

                                        {/* Route */}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-text">
                                                {booking.pickupLocation} <span className="text-muted">→</span> {booking.dropoffLocation}
                                            </p>
                                            <p className="truncate text-xs text-muted">{booking.region.name}</p>
                                        </div>

                                        {/* Date */}
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-text">{fmtDate(booking.dates.startDate)}</p>
                                            <p className="truncate text-xs text-muted">{fmtTime(booking.dates.startDate)} – {fmtTime(booking.dates.endDate)}</p>
                                        </div>

                                        {/* Vehicle */}
                                        <p className="truncate text-xs text-text">{booking.vehicleType.name} × {booking.quantity}</p>

                                        {/* Customer */}
                                        <p className="truncate text-xs text-text">{booking.user?.name ?? "—"}</p>

                                        {/* Driver */}
                                        <span className={cn(
                                            "inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-xs",
                                            booking.assignedDriver
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border-border text-muted",
                                        )}>
                                            {booking.assignedDriver ? booking.assignedDriver.name : "No Driver"}
                                        </span>

                                        {/* Price */}
                                        <div className="min-w-0 text-right">
                                            <p className="truncate text-sm font-bold text-gold">${booking.finalPrice.toFixed(2)}</p>
                                            {hasSavings && (
                                                <p className="text-xs text-muted line-through">${booking.regularPrice.toFixed(2)}</p>
                                            )}
                                        </div>

                                        {/* Chevron */}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                            className={cn("h-4 w-4 text-muted transition-transform", isExpanded && "rotate-180")}>
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </div>

                                    {/* Mobile row */}
                                    <div className="flex items-center gap-3 px-4 py-3 xl:hidden">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[booking.status])}>
                                                    {STATUS_LABELS[booking.status]}
                                                </span>
                                                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", PAYMENT_COLORS[booking.paymentStatus])}>
                                                    {booking.paymentStatus}
                                                </span>
                                            </div>
                                            <p className="truncate text-sm text-text">
                                                {booking.pickupLocation} → {booking.dropoffLocation}
                                            </p>
                                            <p className="text-xs text-muted">{booking.region.name} · {fmtDate(booking.dates.startDate)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-gold">${booking.finalPrice.toFixed(2)}</p>
                                            {hasSavings && <p className="text-xs text-muted line-through">${booking.regularPrice.toFixed(2)}</p>}
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                            className={cn("h-4 w-4 shrink-0 text-muted transition-transform", isExpanded && "rotate-180")}>
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t border-border bg-white/1 px-4 pb-4 pt-3">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                                            <div>
                                                <p className="text-xs text-muted">Customer</p>
                                                <p className="text-sm text-text">{booking.user?.name ?? "—"}</p>
                                                <p className="text-xs text-muted">{booking.user?.email}</p>
                                                <p className="text-xs text-muted">{booking.user?.phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Driver</p>
                                                <p className={cn("text-sm", booking.assignedDriver ? "text-text" : "text-muted")}>
                                                    {booking.assignedDriver ? booking.assignedDriver.name : "Not assigned"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Price</p>
                                                <p className="text-sm font-semibold text-gold">${booking.finalPrice.toFixed(2)}</p>
                                                {hasSavings && (
                                                    <>
                                                        <p className="text-xs text-muted line-through">${booking.regularPrice.toFixed(2)}</p>
                                                        <p className="text-xs text-emerald-400">-${booking.savings.toFixed(2)} saved</p>
                                                    </>
                                                )}
                                            </div>
                                            {booking.tip > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted">Tip</p>
                                                    <p className="text-sm text-text">${booking.tip.toFixed(2)}</p>
                                                </div>
                                            )}
                                            {booking.rating !== null && (
                                                <div>
                                                    <p className="text-xs text-muted">Rating</p>
                                                    <p className="text-sm text-text">⭐ {booking.rating}/5</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs text-muted">Booking mode</p>
                                                <p className="text-sm text-text">{fmtBookingMode(booking.bookingMode)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Booked at</p>
                                                <p className="text-sm text-text">{fmtDateTime(booking.createdAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted">Vehicle</p>
                                                <p className="text-sm text-text">{booking.vehicleType.name} × {booking.quantity}</p>
                                                <p className="text-xs text-muted">${booking.vehicleType.hourlyPrice}/hr</p>
                                            </div>
                                        </div>

                                        {booking.addOns.length > 0 && (
                                            <div className="mt-3">
                                                <p className="mb-1.5 text-xs text-muted">Add-ons</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {booking.addOns.map((a) => (
                                                        <span key={a._id} className="rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-gold">
                                                            {a.name} (+${a.price.toFixed(2)})
                                                        </span>
                                                    ))}
                                                </div>
                                                {addonTotal > 0 && (
                                                    <p className="mt-1 text-xs text-muted">Add-ons total: ${addonTotal.toFixed(2)}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Assign driver — unassigned, still-assignable bookings */}
                                        {!booking.assignedDriver &&
                                            !["Cancelled", "Completed", "Expired"].includes(booking.status) &&
                                            (assignOpen === booking._id ? (
                                                <AssignDriverPanel
                                                    bookingId={booking._id}
                                                    onAssigned={(driver) => {
                                                        patchBooking(booking._id, {
                                                            assignedDriver: driver,
                                                            status: "Confirmed",
                                                        });
                                                        setAssignOpen(null);
                                                    }}
                                                />
                                            ) : (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setAssignOpen(booking._id)}
                                                        className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                                                    >
                                                        Assign Driver
                                                    </button>
                                                    <button
                                                        onClick={() => handleRedispatch(booking._id)}
                                                        disabled={actionBookingId !== null}
                                                        className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-400 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {actionBookingId === booking._id ? "Re-dispatching…" : "Re-dispatch"}
                                                    </button>
                                                </div>
                                            ))}

                                        {/* Unassign driver — booking has a driver and is still active */}
                                        {booking.assignedDriver &&
                                            !["Cancelled", "Completed", "Expired"].includes(booking.status) && (
                                                <button
                                                    onClick={() => handleUnassign(booking._id)}
                                                    disabled={actionBookingId !== null}
                                                    className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {actionBookingId === booking._id ? "Unassigning…" : "Unassign Driver"}
                                                </button>
                                            )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <span className="text-xs text-muted">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                disabled={page <= 1 || isPending}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border/80 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= pagination.totalPages || isPending}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border/80 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

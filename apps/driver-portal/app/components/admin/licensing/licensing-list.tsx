"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    LICENSE_STATUS_LABELS,
    LICENSE_STATUS_COLORS,
    BG_STATUS_LABELS,
    BG_STATUS_COLORS,
    TIER_COLORS,
} from "./licensing-types";
import type { ApiLicensingDriver, LicensingStats, LicensingPage } from "@/lib/admin-api";
import { fetchLicensingClient } from "@/lib/admin-api";
import { PhoneLink } from "@/app/components/ui/phone-link";

const LIMIT = 20;

// grid: [name 1fr] [email 200px] [phone 160px] [license 120px] [background 120px] [tier 90px] [registered 130px]
const GRID = "grid-cols-[1fr_200px_160px_120px_120px_90px_130px]";

type Props = {
    initialDrivers: ApiLicensingDriver[];
    initialStats: LicensingStats;
    initialTotal: number;
    initialPages: number;
};

export function LicensingList({ initialDrivers, initialStats, initialTotal, initialPages }: Props) {
    const [drivers, setDrivers] = useState<ApiLicensingDriver[]>(initialDrivers);
    const [stats, setStats] = useState<LicensingStats>(initialStats);
    const [total, setTotal] = useState(initialTotal);
    const [pages, setPages] = useState(initialPages);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstMount = useRef(true);

    const load = (opts: { search: string; page: number }) => {
        startTransition(async () => {
            setError(null);
            try {
                const result: LicensingPage = await fetchLicensingClient({
                    ...(opts.search ? { search: opts.search } : {}),
                    page: opts.page,
                    limit: LIMIT,
                });
                setDrivers(result.drivers);
                setStats(result.stats);
                setTotal(result.total);
                setPages(result.pages);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load data");
            }
        });
    };

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setPage(1);
            load({ search, page: 1 });
        }, 400);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (isFirstMount.current) return;
        load({ search, page });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    return (
        <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Verified</p>
                    <p className="mt-1 text-xl font-bold text-gold">{stats.verified}</p>
                    <p className="text-xs text-muted">Background verified</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Pending</p>
                    <p className="mt-1 text-xl font-bold text-text">{stats.pending}</p>
                    <p className="text-xs text-muted">Under review</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Total</p>
                    <p className="mt-1 text-xl font-bold text-text">{stats.total}</p>
                    <p className="text-xs text-muted">Registered drivers</p>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                {/* Search */}
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="relative max-w-sm flex-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, license…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-border bg-page-bg py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                        />
                    </div>
                    {error && <span className="text-xs text-red-400">{error}</span>}
                    <span className="shrink-0 text-xs text-muted">
                        {isPending ? "Loading…" : `${total} driver${total !== 1 ? "s" : ""}`}
                    </span>
                </div>

                {/* Header */}
                <div className={cn("hidden xl:grid items-center gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted", GRID)}>
                    <span>Driver</span>
                    <span>Email</span>
                    <span>Phone</span>
                    <span className="text-center">License</span>
                    <span className="text-center">Background</span>
                    <span className="text-center">Tier</span>
                    <span>Registered</span>
                </div>

                <div className={cn("flex flex-col divide-y divide-border", isPending && "opacity-50 pointer-events-none")}>
                    {!isPending && drivers.length === 0 && (
                        <div className="py-16 text-center text-sm text-muted">No drivers found.</div>
                    )}
                    {drivers.map((driver) => {
                        return (
                            <div key={driver._id} className="transition-colors hover:bg-white/2">
                                {/* Desktop row */}
                                <div className={cn("hidden xl:grid items-center gap-3 px-4 py-3", GRID)}>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-text">{driver.name}</p>
                                        {driver.license.number && (
                                            <p className="text-xs text-muted">
                                                {driver.license.number}
                                                {driver.license.expiry && ` · exp ${new Date(driver.license.expiry).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                                            </p>
                                        )}
                                        {driver.license.hasForHireLicense && (
                                            <p className="text-xs text-gold">For-hire licensed</p>
                                        )}
                                    </div>
                                    <p className="truncate text-xs text-muted">{driver.email}</p>
                                    <p className="text-xs text-muted">
                                        <PhoneLink phone={driver.phone} className="text-muted hover:text-gold" />
                                    </p>

                                    {/* License status */}
                                    <div className="flex justify-center">
                                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", LICENSE_STATUS_COLORS[driver.license.status])}>
                                            {LICENSE_STATUS_LABELS[driver.license.status]}
                                        </span>
                                    </div>

                                    {/* Background status */}
                                    <div className="flex justify-center">
                                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", BG_STATUS_COLORS[driver.background.status])}>
                                            {BG_STATUS_LABELS[driver.background.status]}
                                        </span>
                                    </div>

                                    {/* Tier */}
                                    <p className={cn("text-center text-xs font-semibold", TIER_COLORS[driver.tier])}>
                                        {driver.tier}
                                    </p>

                                    {/* Registered */}
                                    <p className="text-xs text-muted">
                                        {new Date(driver.registeredAt).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </p>
                                </div>

                                {/* Mobile row */}
                                <div className="flex items-start gap-3 px-4 py-3 xl:hidden">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-text">{driver.name}</span>
                                            <span className={cn("rounded-full border px-2 py-0.5 text-xs", LICENSE_STATUS_COLORS[driver.license.status])}>
                                                {LICENSE_STATUS_LABELS[driver.license.status]}
                                            </span>
                                            <span className={cn("rounded-full border px-2 py-0.5 text-xs", BG_STATUS_COLORS[driver.background.status])}>
                                                {BG_STATUS_LABELS[driver.background.status]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted">{driver.email}</p>
                                        <p className="text-xs text-muted">
                                            <PhoneLink phone={driver.phone} className="text-muted hover:text-gold" />
                                            {" · "}
                                            <span className={cn("font-medium", TIER_COLORS[driver.tier])}>{driver.tier}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <span className="text-xs text-muted">Page {page} of {pages}</span>
                        <div className="flex gap-1.5">
                            <button
                                disabled={page <= 1 || isPending}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border/80 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= pages || isPending}
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


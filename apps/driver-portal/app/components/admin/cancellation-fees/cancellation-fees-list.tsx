"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    FEE_STATUS_LABELS,
    FEE_STATUS_COLORS,
    REASON_LABELS,
    type CancellationFee,
    type CancellationFeeStatus,
} from "./cancellation-types";

const ALL = "all" as const;
type Filter = CancellationFeeStatus | typeof ALL;

const FILTERS: { key: Filter; label: string }[] = [
    { key: ALL, label: "All" },
    { key: "charged", label: "Charged" },
    { key: "pending", label: "Pending" },
    { key: "waived", label: "Waived" },
];

// grid: [driver 1fr] [rider 1fr] [amount 100px] [reason 180px] [status 110px] [date 120px]
const GRID = "grid-cols-[1fr_1fr_100px_180px_110px_120px]";

type Props = { initialFees: CancellationFee[] };

export function CancellationFeesList({ initialFees }: Props) {
    const [fees] = useState<CancellationFee[]>(initialFees);
    const [filter, setFilter] = useState<Filter>(ALL);
    const [search, setSearch] = useState("");

    const filtered = fees.filter((f) => {
        const matchStatus = filter === ALL || f.status === filter;
        const q = search.toLowerCase();
        const matchSearch = !q || f.driverName.toLowerCase().includes(q) || f.riderName.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    const totalCharged = fees.filter((f) => f.status === "charged").reduce((s, f) => s + f.amount, 0);
    const totalCancellations = fees.length;
    const avgFee = totalCancellations > 0 ? fees.reduce((s, f) => s + f.amount, 0) / totalCancellations : 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Total Fees</p>
                    <p className="mt-1 text-xl font-bold text-gold">${totalCharged.toFixed(2)}</p>
                    <p className="text-xs text-muted">This month</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Cancellations</p>
                    <p className="mt-1 text-xl font-bold text-text">{totalCancellations}</p>
                    <p className="text-xs text-muted">This week</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Average Fee</p>
                    <p className="mt-1 text-xl font-bold text-text">${avgFee.toFixed(2)}</p>
                    <p className="text-xs text-muted">Per cancellation</p>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
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
                    <div className="relative">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search driver or rider…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-56 rounded-xl border border-border bg-page-bg py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Header */}
                <div className={cn("hidden lg:grid items-center gap-4 border-b border-border px-4 py-2.5 text-xs font-medium text-muted", GRID)}>
                    <span>Driver</span>
                    <span>Rider</span>
                    <span className="text-right">Amount</span>
                    <span>Reason</span>
                    <span className="text-center">Status</span>
                    <span className="text-right">Date</span>
                </div>

                <div className="flex flex-col divide-y divide-border">
                    {filtered.length === 0 && (
                        <div className="py-16 text-center text-sm text-muted">No cancellation fees found.</div>
                    )}
                    {filtered.map((fee) => (
                        <div key={fee.id} className="transition-colors hover:bg-white/2">
                            {/* Desktop row */}
                            <div className={cn("hidden lg:grid items-center gap-4 px-4 py-3", GRID)}>
                                <p className="truncate text-sm text-text">{fee.driverName}</p>
                                <p className="truncate text-sm text-muted">{fee.riderName}</p>
                                <p className="text-right text-sm font-semibold text-gold">${fee.amount.toFixed(2)}</p>
                                <p className="text-sm text-muted">{REASON_LABELS[fee.reason]}</p>
                                <div className="flex justify-center">
                                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", FEE_STATUS_COLORS[fee.status])}>
                                        {FEE_STATUS_LABELS[fee.status]}
                                    </span>
                                </div>
                                <p className="text-right text-xs text-muted">
                                    {new Date(fee.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                            </div>

                            {/* Mobile row */}
                            <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-text">{fee.driverName}</span>
                                        <span className="text-xs text-muted">→ {fee.riderName}</span>
                                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", FEE_STATUS_COLORS[fee.status])}>
                                            {FEE_STATUS_LABELS[fee.status]}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted">{REASON_LABELS[fee.reason]}</p>
                                    <p className="text-xs text-muted">{new Date(fee.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                </div>
                                <p className="shrink-0 text-sm font-bold text-gold">${fee.amount.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

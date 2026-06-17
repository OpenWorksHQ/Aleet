"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    PAYOUT_STATUS_LABELS,
    PAYOUT_STATUS_COLORS,
    getInitials,
    type DriverPayout,
    type PayoutStatus,
} from "./payout-types";

const ALL = "all" as const;
type Filter = PayoutStatus | typeof ALL;

const FILTERS: { key: Filter; label: string }[] = [
    { key: ALL, label: "All" },
    { key: "ready", label: "Ready" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "on_hold", label: "On Hold" },
];

// grid: [driver] [trips] [earnings] [tips] [base split] [deductions] [net payout] [next payout] [status] [actions]
const GRID = "grid-cols-[1fr_60px_110px_110px_110px_110px_120px_100px_100px_160px]";

type Props = { initialPayouts: DriverPayout[] };

export function PayoutsList({ initialPayouts }: Props) {
    const [payouts, setPayouts] = useState<DriverPayout[]>(initialPayouts);
    const [filter, setFilter] = useState<Filter>(ALL);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const filtered = filter === ALL ? payouts : payouts.filter((p) => p.status === filter);

    const totalReady = payouts.filter((p) => p.status === "ready").reduce((s, p) => s + p.netPayout, 0);
    const totalPaid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.netPayout, 0);

    function patchLocal(id: string, patch: Partial<DriverPayout>) {
        setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    }

    async function handleOverride(payout: DriverPayout) {
        // placeholder — wire to real API
        setLoadingId(payout.id);
        await new Promise((r) => setTimeout(r, 600));
        patchLocal(payout.id, { status: "pending" });
        setLoadingId(null);
    }

    async function handleRunPayout(payout: DriverPayout) {
        if (!confirm(`Run payout for ${payout.driverName}? Net: $${payout.netPayout.toFixed(2)}`)) return;
        setLoadingId(payout.id);
        await new Promise((r) => setTimeout(r, 800));
        patchLocal(payout.id, { status: "paid" });
        setLoadingId(null);
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Total Drivers</p>
                    <p className="mt-1 text-xl font-bold text-text">{payouts.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Ready to Pay</p>
                    <p className="mt-1 text-xl font-bold text-gold">${totalReady.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">Paid This Cycle</p>
                    <p className="mt-1 text-xl font-bold text-emerald-400">${totalPaid.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                    <p className="text-xs text-muted">On Hold</p>
                    <p className="mt-1 text-xl font-bold text-red-400">
                        {payouts.filter((p) => p.status === "on_hold").length}
                    </p>
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
                    <span className="text-xs text-muted">{filtered.length} driver{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Header */}
                <div className={cn("hidden xl:grid items-center gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted", GRID)}>
                    <span>Driver</span>
                    <span className="text-right">Trips</span>
                    <span className="text-right">Earnings</span>
                    <span className="text-right">Tips (100%)</span>
                    <span className="text-right">Base Split</span>
                    <span className="text-right">Deductions</span>
                    <span className="text-right">Net Payout</span>
                    <span className="text-center">Next Payout</span>
                    <span className="text-center">Status</span>
                    <span className="text-right">Actions</span>
                </div>

                <div className="flex flex-col divide-y divide-border">
                    {filtered.length === 0 && (
                        <div className="py-16 text-center text-sm text-muted">No payouts found.</div>
                    )}
                    {filtered.map((payout) => {
                        const isBusy = loadingId === payout.id;
                        const initials = getInitials(payout.driverName);

                        return (
                            <div key={payout.id} className={cn("transition-colors hover:bg-white/2", isBusy && "opacity-60")}>
                                {/* Desktop row */}
                                <div className={cn("hidden xl:grid items-center gap-3 px-4 py-3", GRID)}>
                                    {/* Driver */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-text">{payout.driverName}</p>
                                            {payout.stripeAccountId ? (
                                                <p className="text-xs text-muted">{payout.stripeAccountId}</p>
                                            ) : (
                                                <p className="text-xs text-red-400">No Stripe account</p>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-right text-xs text-muted">{payout.tripsCount}</p>
                                    <p className="text-right text-sm font-medium text-gold">${payout.earnings.toFixed(2)}</p>
                                    <p className="text-right text-sm text-text">${payout.tips.toFixed(2)}</p>
                                    <p className="text-right text-sm text-text">${payout.baseSplit.toFixed(2)}</p>
                                    <p className={cn("text-right text-sm", payout.deductions > 0 ? "text-red-400" : "text-muted")}>
                                        {payout.deductions > 0 ? `-$${payout.deductions.toFixed(2)}` : "$0.00"}
                                    </p>
                                    <p className="text-right text-sm font-bold text-text">${payout.netPayout.toFixed(2)}</p>
                                    <p className="text-center text-xs text-muted">{payout.nextPayoutDay}</p>

                                    {/* Status */}
                                    <div className="flex justify-center">
                                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", PAYOUT_STATUS_COLORS[payout.status])}>
                                            {PAYOUT_STATUS_LABELS[payout.status]}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2">
                                        {payout.status === "ready" && (
                                            <button
                                                disabled={isBusy}
                                                onClick={() => handleRunPayout(payout)}
                                                className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
                                            >
                                                {isBusy ? "…" : "Pay Now"}
                                            </button>
                                        )}
                                        <button
                                            disabled={isBusy}
                                            onClick={() => handleOverride(payout)}
                                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-50"
                                        >
                                            Override
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile / tablet row */}
                                <div className="flex items-center gap-3 px-4 py-3 xl:hidden">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-medium text-text">{payout.driverName}</span>
                                            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", PAYOUT_STATUS_COLORS[payout.status])}>
                                                {PAYOUT_STATUS_LABELS[payout.status]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted">{payout.tripsCount} trips · Next: {payout.nextPayoutDay}</p>
                                        <p className="text-xs text-muted">
                                            Earnings: <span className="text-gold">${payout.earnings.toFixed(2)}</span>
                                            {payout.deductions > 0 && <span className="text-red-400"> · -{`$${payout.deductions.toFixed(2)}`}</span>}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold text-text">${payout.netPayout.toFixed(2)}</p>
                                        {payout.status === "ready" && (
                                            <button
                                                disabled={isBusy}
                                                onClick={() => handleRunPayout(payout)}
                                                className="mt-1 rounded-lg border border-gold/40 px-2.5 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                                            >
                                                {isBusy ? "…" : "Pay"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

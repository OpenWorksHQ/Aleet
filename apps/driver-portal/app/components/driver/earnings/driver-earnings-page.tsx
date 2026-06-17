"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    createPayoutMethodClient,
    deletePayoutMethodClient,
    listPayoutMethodsClient,
    setPrimaryPayoutMethodClient,
    type CreatePayoutMethodPayload,
} from "@/lib/bank-accounts-api";
import type {
    DriverDashboardEarningsData,
    DriverPayoutMethod,
} from "@/lib/driver-dashboard-earnings-api";

type ChartMode = "area" | "bar";

type Props = {
    initialData: DriverDashboardEarningsData;
};

const STATUS_LABELS: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    processing: "Processing",
};

const STATUS_COLORS: Record<string, string> = {
    paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    processing: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

function fmtDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fmtMoney(value: number): string {
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function fmtMoney0(value: number): string {
    return `$${value.toFixed(0)}`;
}

function normalizeStatus(value: string): string {
    return value.trim().toLowerCase();
}

function payoutMethodLabel(method: DriverPayoutMethod): string {
    if (method.label) return method.label;
    return method.type === "paypal" ? "PayPal" : "Bank Account";
}

function payoutMethodDetail(method: DriverPayoutMethod): string {
    if (method.type === "paypal") return method.paypalEmail ?? "—";
    if (method.bankName && method.last4) return `${method.bankName} ••••${method.last4}`;
    if (method.last4) return `••••${method.last4}`;
    return method.bankName ?? "—";
}

function PayoutMethodCard({
    method,
    onSetPrimary,
    onDelete,
    isBusy,
}: {
    method: DriverPayoutMethod;
    onSetPrimary: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    isBusy: boolean;
}) {
    const icon =
        method.type === "paypal" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-sky-400">
                <path d="M7 11C7 11 6 17 12 17C18 17 19 11 17 9C15 7 12 8 12 8L10 18" />
                <path d="M10 8C10 8 9 14 15 14C21 14 22 8 20 6" />
            </svg>
        ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gold">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
        );

    return (
        <div
            className={cn(
                "flex items-center justify-between rounded-xl border p-4 transition-colors",
                method.isPrimary ? "border-gold/30 bg-gold/5" : "border-border bg-page-bg",
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        method.isPrimary ? "bg-gold/10" : "bg-border/40",
                    )}
                >
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-text">{payoutMethodLabel(method)}</p>
                    <p className="text-xs text-muted">{payoutMethodDetail(method)}</p>
                </div>
            </div>
            {method.isPrimary ? (
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
                    Primary
                </span>
            ) : (
                <div className="flex items-center gap-2">
                    <button
                        disabled={isBusy}
                        onClick={() => void onSetPrimary(method.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                    >
                        Set Primary
                    </button>
                    <button
                        disabled={isBusy}
                        onClick={() => void onDelete(method.id)}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
}

function AddPayoutMethodModal({
    onClose,
    onSubmit,
    isSaving,
}: {
    onClose: () => void;
    onSubmit: (payload: CreatePayoutMethodPayload) => Promise<void>;
    isSaving: boolean;
}) {
    const [label, setLabel] = useState("");
    const [paypalEmail, setPaypalEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!label.trim()) {
            setError("Label is required.");
            return;
        }

        if (!paypalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
            setError("Valid PayPal email is required.");
            return;
        }

        try {
            await onSubmit({
                type: "paypal",
                label: label.trim(),
                paypalEmail: paypalEmail.trim(),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to add payout method.");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card-bg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-4 top-4 text-muted transition-colors hover:text-text"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>

                <h3 className="text-lg font-bold text-text">Add Payout Method</h3>
                <p className="mt-1 text-sm text-muted">Add PayPal details for payout transfers.</p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Label</label>
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="My PayPal"
                            className="w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">PayPal Email</label>
                        <input
                            type="email"
                            value={paypalEmail}
                            onChange={(e) => setPaypalEmail(e.target.value)}
                            placeholder="driver@example.com"
                            className="w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-text"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold/90 disabled:opacity-60"
                        >
                            {isSaving ? "Saving..." : "Add Method"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function DriverEarningsPage({ initialData }: Props) {
    const [chartMode, setChartMode] = useState<ChartMode>("area");
    const [methods, setMethods] = useState(initialData.payoutMethods);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSavingMethod, setIsSavingMethod] = useState(false);
    const [busyMethodId, setBusyMethodId] = useState<string | null>(null);
    const [methodsError, setMethodsError] = useState<string | null>(null);
    const [methodsSuccess, setMethodsSuccess] = useState<string | null>(null);

    async function refreshMethods() {
        const list = await listPayoutMethodsClient();
        setMethods(list);
    }

    async function handleSetPrimary(id: string) {
        setBusyMethodId(id);
        setMethodsError(null);
        setMethodsSuccess(null);
        try {
            await setPrimaryPayoutMethodClient(id);
            await refreshMethods();
            setMethodsSuccess("Primary payout method updated.");
        } catch (e) {
            setMethodsError(e instanceof Error ? e.message : "Failed to set primary method.");
        } finally {
            setBusyMethodId(null);
        }
    }

    async function handleDeleteMethod(id: string) {
        if (!confirm("Remove this payout method?")) return;
        setBusyMethodId(id);
        setMethodsError(null);
        setMethodsSuccess(null);
        try {
            await deletePayoutMethodClient(id);
            await refreshMethods();
            setMethodsSuccess("Payout method removed.");
        } catch (e) {
            setMethodsError(e instanceof Error ? e.message : "Failed to remove payout method.");
        } finally {
            setBusyMethodId(null);
        }
    }

    async function handleAddMethod(payload: CreatePayoutMethodPayload) {
        setIsSavingMethod(true);
        setMethodsSuccess(null);
        try {
            await createPayoutMethodClient(payload);
            await refreshMethods();
            setMethodsSuccess("Payout method added.");
            setShowAddModal(false);
        } catch (e) {
            throw (e instanceof Error ? e : new Error("Failed to add payout method."));
        } finally {
            setIsSavingMethod(false);
        }
    }

    const topStats = initialData.topStats;
    const weeklyChart = initialData.weeklyChart;
    const dailyBreakdown = initialData.dailyBreakdown;
    const goals = initialData.earningsGoals;
    const weekTotal = goals.thisWeekBreakdown.base + goals.thisWeekBreakdown.tips;

    return (
        <div className="flex flex-col gap-6">
            {showAddModal && (
                <AddPayoutMethodModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddMethod}
                    isSaving={isSavingMethod}
                />
            )}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gold">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        ),
                        label: "Total Earnings",
                        value: fmtMoney(topStats.totalEarnings),
                        sub: "This month",
                        subColor: "text-gold",
                        color: "bg-gold/10",
                    },
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-400">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                        ),
                        label: "Weekly Avg",
                        value: fmtMoney(topStats.weeklyAvg),
                        sub: `${topStats.weeklyChangePercent >= 0 ? "+" : ""}${topStats.weeklyChangePercent}% from last week`,
                        subColor: topStats.weeklyChangePercent >= 0 ? "text-emerald-400" : "text-red-400",
                        color: "bg-emerald-500/10",
                    },
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-sky-400">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        ),
                        label: "Today",
                        value: fmtMoney(topStats.todayEarnings),
                        sub: `${topStats.tripsToday} trips completed`,
                        subColor: "text-muted",
                        color: "bg-sky-500/10",
                    },
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-400">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                        ),
                        label: "Pending",
                        value: fmtMoney(topStats.pendingPayout),
                        sub: "Next payout",
                        subColor: "text-muted",
                        color: "bg-amber-500/10",
                    },
                ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-border bg-card-bg p-5">
                        <div className="mb-3 flex items-center gap-2.5">
                            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", s.color)}>
                                {s.icon}
                            </div>
                            <p className="text-sm text-muted">{s.label}</p>
                        </div>
                        <p className="text-2xl font-bold text-text">{s.value}</p>
                        <p className={cn("mt-1 text-xs", s.subColor)}>{s.sub}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-text">Weekly Earnings</h2>
                            <p className="text-xs text-muted">Last 7 days overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-border bg-page-bg p-1">
                        <button
                            onClick={() => setChartMode("area")}
                            className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                chartMode === "area" ? "bg-gold/10 text-gold" : "text-muted hover:text-text",
                            )}
                        >
                            Area
                        </button>
                        <button
                            onClick={() => setChartMode("bar")}
                            className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                chartMode === "bar" ? "bg-gold/10 text-gold" : "text-muted hover:text-text",
                            )}
                        >
                            Bar
                        </button>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                    {chartMode === "area" ? (
                        <AreaChart data={weeklyChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="earningsGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="var(--border-color, #1e2b2a)" strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="day" tick={{ fill: "var(--muted, #4a5c4b)", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "var(--muted, #4a5c4b)", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: "var(--card-bg, #0d1a19)", border: "1px solid var(--border-color, #1e2b2a)", borderRadius: "10px", color: "var(--text, #e8e8e8)", fontSize: "13px" }}
                                formatter={(value) => [fmtMoney(Number(value)), "Earnings"] as [string, string]}
                                labelFormatter={(_, payload) => {
                                    const date = payload?.[0]?.payload?.date as string | undefined;
                                    return date ? fmtDate(date) : "";
                                }}
                            />
                            <Area type="monotone" dataKey="earnings" stroke="#c9a84c" strokeWidth={2} fill="url(#earningsGrad2)" dot={{ fill: "#c9a84c", r: 4, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#c9a84c" }} />
                        </AreaChart>
                    ) : (
                        <BarChart data={weeklyChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <CartesianGrid stroke="var(--border-color, #1e2b2a)" strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="day" tick={{ fill: "var(--muted, #4a5c4b)", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "var(--muted, #4a5c4b)", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: "var(--card-bg, #0d1a19)", border: "1px solid var(--border-color, #1e2b2a)", borderRadius: "10px", color: "var(--text, #e8e8e8)", fontSize: "13px" }}
                                formatter={(value) => [fmtMoney(Number(value)), "Earnings"] as [string, string]}
                                labelFormatter={(_, payload) => {
                                    const date = payload?.[0]?.payload?.date as string | undefined;
                                    return date ? fmtDate(date) : "";
                                }}
                            />
                            <Bar dataKey="earnings" fill="#c9a84c" radius={[6, 6, 0, 0]} opacity={0.85} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-text">Daily Earnings Breakdown</h2>
                            <p className="text-xs text-muted">Last 7 days</p>
                        </div>
                    </div>
                </div>

                <div className="hidden grid-cols-[1fr_60px_120px_90px_110px_100px] items-center gap-3 border-b border-border bg-page-bg/50 px-5 py-2.5 sm:grid">
                    {["Date", "Trips", "Base Earnings", "Tips", "Total", "Status"].map((h) => (
                        <span key={h} className="text-xs font-medium text-muted">{h}</span>
                    ))}
                </div>

                <div className="flex flex-col divide-y divide-border">
                    {dailyBreakdown.length === 0 && (
                        <div className="px-5 py-8 text-sm text-muted">No daily earnings data for the last 7 days.</div>
                    )}

                    {dailyBreakdown.map((row) => {
                        const statusKey = normalizeStatus(row.status);
                        const statusLabel = STATUS_LABELS[statusKey] ?? row.status;
                        const statusColor = STATUS_COLORS[statusKey] ?? "border-border bg-border/20 text-muted";

                        return (
                            <div key={row.date}>
                                <div className="hidden grid-cols-[1fr_60px_120px_90px_110px_100px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/2 sm:grid">
                                    <span className="text-sm text-text">{fmtDate(row.date)}</span>
                                    <span className="text-sm text-text">{row.trips}</span>
                                    <span className="text-sm font-medium text-gold">{fmtMoney(row.baseEarnings)}</span>
                                    <span className="text-sm text-emerald-400">{fmtMoney(row.tips)}</span>
                                    <span className="text-sm font-bold text-text">{fmtMoney(row.total)}</span>
                                    <span className={cn("w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium", statusColor)}>
                                        {statusLabel}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between px-5 py-3.5 sm:hidden">
                                    <div>
                                        <p className="text-sm font-medium text-text">{fmtDate(row.date)}</p>
                                        <p className="mt-0.5 text-xs text-muted">{row.trips} trips · Tips {fmtMoney(row.tips)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <p className="text-sm font-bold text-text">{fmtMoney(row.total)}</p>
                                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", statusColor)}>
                                            {statusLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card-bg p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                    <rect x="2" y="5" width="20" height="14" rx="2" />
                                    <line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                            </div>
                            <h2 className="text-base font-semibold text-text">Payout Methods</h2>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Method
                        </button>
                    </div>

                    {methodsError && (
                        <p className="mb-3 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                            {methodsError}
                        </p>
                    )}
                    {methodsSuccess && (
                        <p className="mb-3 rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
                            {methodsSuccess}
                        </p>
                    )}

                    <div className="flex flex-col gap-3">
                        {methods.length === 0 ? (
                            <div className="rounded-xl border border-border bg-page-bg/60 px-4 py-6 text-center">
                                <p className="text-sm text-muted">No payout methods added yet.</p>
                            </div>
                        ) : (
                            methods.map((m) => (
                                <PayoutMethodCard
                                    key={m.id}
                                    method={m}
                                    onSetPrimary={handleSetPrimary}
                                    onDelete={handleDeleteMethod}
                                    isBusy={busyMethodId === m.id}
                                />
                            ))
                        )}
                    </div>
                    <div className="mt-4 rounded-xl border border-border bg-page-bg/60 p-3.5">
                        <div className="flex items-start gap-2.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p className="text-xs text-muted">{initialData.payoutNote}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card-bg p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-text">Earnings Goals</h2>
                            <p className="text-xs text-muted">Track your progress</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-5">
                        {[
                            { label: "Weekly Goal", data: goals.weekly },
                            { label: "Monthly Goal", data: goals.monthly },
                        ].map((goal) => (
                            <div key={goal.label}>
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-sm font-medium text-text">{goal.label}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted">
                                            {fmtMoney(goal.data.current)} / {fmtMoney(goal.data.goal)}
                                        </span>
                                        <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
                                            {goal.data.progressPercent}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                                    <div
                                        className="h-full rounded-full bg-linear-to-r from-gold/80 to-gold transition-all duration-500"
                                        style={{ width: `${goal.data.progressPercent}%` }}
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-muted">
                                    {goal.data.remaining > 0
                                        ? `${fmtMoney(goal.data.remaining)} more to reach your goal`
                                        : "Goal reached!"}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-page-bg/60 p-4">
                        <p className="mb-3 text-sm font-medium text-text">This Week Breakdown</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Base", value: fmtMoney0(goals.thisWeekBreakdown.base), color: "text-gold" },
                                { label: "Tips", value: fmtMoney0(goals.thisWeekBreakdown.tips), color: "text-emerald-400" },
                                { label: "Total", value: fmtMoney0(weekTotal), color: "text-text" },
                            ].map((item) => (
                                <div key={item.label} className="text-center">
                                    <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                                    <p className="text-xs text-muted">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { DollarSign, Car, Star, AlertCircle } from "lucide-react";
import { cookies } from "next/headers";
import { DriverEarningsChart } from "@/app/components/driver/driver-earnings-chart";
import { fetchDriverDashboard } from "@/lib/driver-dashboard-api";

const URGENCY_LABELS: Record<string, string> = {
    low: "Low",
    due_soon: "Due Soon",
    overdue: "Overdue",
};

const URGENCY_BADGE_CLS: Record<string, string> = {
    low: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    due_soon: "border-gold/30 bg-gold/10 text-gold",
    overdue: "border-red-500/35 bg-red-500/12 text-red-300",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function normalizeMonthKey(month: string): string {
    return month.trim().slice(0, 3).toLowerCase();
}

function formatCurrency(value: number): string {
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export default async function DriverPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";
    const dashboard = await fetchDriverDashboard(token).catch(() => null);
    const data = dashboard ?? {
        driver: { name: "", tier: "", status: "" },
        overview: {
            todayEarnings: 0,
            earningsChangePercent: 0,
            tripsCompletedToday: 0,
            rating: 0,
            totalTrips: 0,
        },
        weeklyGoal: {
            current: 0,
            goal: 0,
            progressPercent: 0,
            remaining: 0,
        },
        earningsOverview: [],
        pendingItems: [],
    };

    const stats = [
        {
            icon: DollarSign,
            label: "Today's Earnings",
            value: formatCurrency(data.overview.todayEarnings),
            sub: `${data.overview.earningsChangePercent >= 0 ? "+" : ""}${data.overview.earningsChangePercent}% from yesterday`,
            subColor: data.overview.earningsChangePercent >= 0 ? "text-emerald-500" : "text-red-400",
        },
        {
            icon: Car,
            label: "Trips Completed",
            value: data.overview.tripsCompletedToday.toLocaleString("en-US"),
            sub: "Today",
            subColor: "text-muted",
        },
        {
            icon: Star,
            label: "Rating",
            value: data.overview.rating.toFixed(1),
            sub: `Based on ${data.overview.totalTrips.toLocaleString("en-US")} trips`,
            subColor: "text-muted",
        },
    ];

    const weeklyGoal = data.weeklyGoal.goal;
    const weeklyEarned = data.weeklyGoal.current;
    const weeklyPct = data.weeklyGoal.progressPercent;
    const pendingItems = data.pendingItems;
    const currentMonthIndex = new Date().getMonth();
    const monthIndexByKey = new Map(MONTHS.map((m, i) => [m.toLowerCase(), i]));
    const earningsOverview = data.earningsOverview.filter((item) => {
        const monthIndex = monthIndexByKey.get(normalizeMonthKey(item.month));
        if (monthIndex == null) return false;
        return monthIndex <= currentMonthIndex;
    });

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-text">Driver Dashboard</h1>
                <p className="mt-1 text-sm text-muted">
                    Welcome back{data.driver.name ? `, ${data.driver.name}` : ""}! Here&apos;s your performance overview
                </p>
                {(data.driver.tier || data.driver.status) && (
                    <p className="mt-1 text-xs text-muted">
                        {data.driver.tier ? `Tier: ${data.driver.tier}` : ""}
                        {data.driver.tier && data.driver.status ? " · " : ""}
                        {data.driver.status ? `Status: ${data.driver.status}` : ""}
                    </p>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-2xl border border-border bg-card-bg p-5">
                        <div className="mb-3 flex items-center gap-2 text-muted">
                            <s.icon className="h-4 w-4 text-gold" />
                            <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-text">{s.value}</p>
                        <p className={`mt-1 text-xs ${s.subColor}`}>{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Chart + sidebar */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Chart — takes 2/3 */}
                <div className="xl:col-span-2">
                    <DriverEarningsChart data={earningsOverview} />
                </div>

                {/* Weekly Goal + Pending */}
                <div className="flex flex-col gap-4">
                    {/* Weekly Goal */}
                    <div className="rounded-2xl border border-border bg-card-bg p-5">
                        <h3 className="mb-4 text-base font-semibold text-text">Weekly Goal</h3>
                        <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-muted">
                                {formatCurrency(weeklyEarned)} / {formatCurrency(weeklyGoal)}
                            </span>
                            <span className="font-medium text-gold">{weeklyPct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                            <div
                                className="h-full rounded-full bg-gold transition-all"
                                style={{ width: `${weeklyPct}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted">
                            {formatCurrency(data.weeklyGoal.remaining)} left to reach your weekly goal
                        </p>
                    </div>

                    {/* Pending Items */}
                    <div className="rounded-2xl border border-border bg-card-bg p-5">
                        <h3 className="mb-4 text-base font-semibold text-text">Pending Items</h3>
                        {pendingItems.length === 0 ? (
                            <p className="text-sm text-muted">No pending items.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {pendingItems.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm text-text">
                                            <AlertCircle className="h-4 w-4 text-gold/70 shrink-0" />
                                            <span>
                                                {item.label}{" "}
                                                {item.amount > 0 ? (
                                                    <span className="text-muted">({formatCurrency(item.amount)})</span>
                                                ) : null}
                                            </span>
                                        </div>
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                                                URGENCY_BADGE_CLS[item.urgency] ??
                                                "border-gold/30 bg-gold/10 text-gold"
                                            }`}
                                        >
                                            {URGENCY_LABELS[item.urgency] ?? item.urgency}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

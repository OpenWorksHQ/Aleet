import { cookies } from "next/headers";
import { StatCard } from "@/app/components/admin/stat-card";
import { RevenueChart } from "@/app/components/admin/revenue-chart";
import { RecentTrips } from "@/app/components/admin/recent-trips";
import { TopDrivers } from "@/app/components/admin/top-drivers";
import {
    fetchAdminDashboard,
    type AdminDashboardData,
    type DashboardStat,
} from "@/lib/admin-api";

function fmtInt(value: number): string {
    return value.toLocaleString("en-US");
}

function fmtMoney(value: number): string {
    return `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function fmtChange(changePercent?: number): { text: string; positive: boolean } {
    if (typeof changePercent !== "number") return { text: "", positive: true };
    const positive = changePercent >= 0;
    const abs = Math.abs(changePercent);
    return {
        text: `${positive ? "+" : "-"}${abs}%`,
        positive,
    };
}

function emptyStat(label: string): DashboardStat {
    return { value: 0, label, changePercent: 0 };
}

const emptyDashboard: AdminDashboardData = {
    stats: {
        activeDrivers: emptyStat("from last week"),
        totalTrips: emptyStat("from yesterday"),
        revenue: emptyStat("from last month"),
        growthRate: { value: 0, label: "Monthly growth" },
    },
    revenueOverview: [],
    recentTrips: [],
    topDrivers: [],
};

export default async function AdminDashboardPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";

    let dashboard = emptyDashboard;
    let dashboardError: string | null = null;

    try {
        dashboard = await fetchAdminDashboard(token);
    } catch (e) {
        dashboardError = e instanceof Error ? e.message : "Failed to load dashboard data.";
    }

    const activeDriversChange = fmtChange(dashboard.stats.activeDrivers.changePercent);
    const totalTripsChange = fmtChange(dashboard.stats.totalTrips.changePercent);
    const revenueChange = fmtChange(dashboard.stats.revenue.changePercent);

    return (
        <div className="flex flex-col gap-6">
            {/* Page heading */}
            <div className="rounded-2xl border border-border bg-card-bg px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text sm:text-3xl">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-muted">Overview of platform performance and metrics</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                    Export Report
                </button>
            </div>

            {dashboardError && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                    Failed to load live dashboard metrics: {dashboardError}
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Active Drivers"
                    value={fmtInt(dashboard.stats.activeDrivers.value)}
                    change={activeDriversChange.text}
                    changeLabel={dashboard.stats.activeDrivers.label}
                    positive={activeDriversChange.positive}
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                    }
                />
                <StatCard
                    title="Total Trips"
                    value={fmtInt(dashboard.stats.totalTrips.value)}
                    change={totalTripsChange.text}
                    changeLabel={dashboard.stats.totalTrips.label}
                    positive={totalTripsChange.positive}
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M3 14h18M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
                            <circle cx="7.5" cy="16.8" r="1.7" />
                            <circle cx="16.5" cy="16.8" r="1.7" />
                        </svg>
                    }
                />
                <StatCard
                    title="Revenue"
                    value={fmtMoney(dashboard.stats.revenue.value)}
                    change={revenueChange.text}
                    changeLabel={dashboard.stats.revenue.label}
                    positive={revenueChange.positive}
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    }
                />
                <StatCard
                    title="Growth Rate"
                    value={`${dashboard.stats.growthRate.value}%`}
                    change=""
                    changeLabel={dashboard.stats.growthRate.label}
                    positive
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                            <polyline points="16 7 22 7 22 13" />
                        </svg>
                    }
                />
            </div>

            {/* Revenue chart */}
            <RevenueChart data={dashboard.revenueOverview} />

            {/* Bottom row */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <RecentTrips trips={dashboard.recentTrips} />
                <TopDrivers drivers={dashboard.topDrivers} />
            </div>
        </div>
    );
}

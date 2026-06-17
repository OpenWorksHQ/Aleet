import { cookies } from "next/headers";
import { DriverEarningsPage } from "@/app/components/driver/earnings/driver-earnings-page";
import {
    EMPTY_DRIVER_DASHBOARD_EARNINGS_DATA,
    fetchDriverDashboardEarnings,
} from "@/lib/driver-dashboard-earnings-api";

export default async function EarningsPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";
    const initialData = await fetchDriverDashboardEarnings(token).catch(
        () => EMPTY_DRIVER_DASHBOARD_EARNINGS_DATA,
    );

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Earnings & Payouts</h1>
                    <p className="mt-1 text-sm text-muted">Track your earnings and manage payouts</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-border bg-card-bg px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export Report
                </button>
            </div>

            <DriverEarningsPage initialData={initialData} />
        </div>
    );
}

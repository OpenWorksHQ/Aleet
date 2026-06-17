import { cookies } from "next/headers";
import { DriverTripsList } from "@/app/components/driver/trips/driver-trips-list";
import { fetchDriverDashboardTrips } from "@/lib/driver-dashboard-trips-api";

export default async function DriverTripsPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";
    const initialData = await fetchDriverDashboardTrips(token, {
        tab: "available",
        page: 1,
        limit: 20,
    }).catch(() => ({
        stats: { availableTrips: 0, myTrips: 0, completed: 0, totalEarnings: 0 },
        trips: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    }));

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Available Trips</h1>
                    <p className="mt-1 text-sm text-muted">Find and accept trips in your area</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted hover:border-gold/40 hover:text-gold transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-.08-5" />
                    </svg>
                    Refresh
                </button>
            </div>

            <DriverTripsList initialData={initialData} />
        </div>
    );
}

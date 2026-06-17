import { cookies } from "next/headers";
import { fetchTierPerformance, fetchTierSettings } from "@/lib/admin-api";
import type { ApiTierDriver, TierCounts, TierPerformancePage, TierSettings } from "@/lib/admin-api";
import { TiersList } from "@/app/components/admin/tiers/tiers-list";

export default async function TiersPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? "";

    let initialDrivers: ApiTierDriver[] = [];
    let initialTierCounts: TierCounts = { "S-Level": 0, Pro: 0, Diamond: 0 };
    let initialPagination: TierPerformancePage["pagination"] = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    };
    let initialSettings: TierSettings | null = null;

    try {
        const [data, settings] = await Promise.all([
            fetchTierPerformance(token, { page: 1, limit: 20 }),
            fetchTierSettings(token),
        ]);
        initialDrivers = data.drivers;
        initialTierCounts = data.tierCounts;
        initialPagination = data.pagination;
        initialSettings = settings;
    } catch {
        // render with empty state on error
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card-bg px-5 py-4">
                <div>
                    <h1 className="text-xl font-bold text-text sm:text-2xl">Tiers & Policy</h1>
                    <p className="text-sm text-muted">Manage driver tiers and reward policies</p>
                </div>
            </div>

            <TiersList
                initialDrivers={initialDrivers}
                initialTierCounts={initialTierCounts}
                initialPagination={initialPagination}
                initialSettings={initialSettings}
            />
        </div>
    );
}


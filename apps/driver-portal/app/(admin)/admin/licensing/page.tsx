import { cookies } from "next/headers";
import { fetchLicensing } from "@/lib/admin-api";
import type { LicensingPage } from "@/lib/admin-api";
import { LicensingList } from "@/app/components/admin/licensing/licensing-list";

export const metadata = {
    title: "Licensing & Background — Aleet Admin",
};

export default async function LicensingPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? "";

    let data: LicensingPage = {
        drivers: [],
        stats: { verified: 0, pending: 0, total: 0 },
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
    };

    try {
        data = await fetchLicensing(token, { page: 1, limit: 20 });
    } catch {
        // render empty state on error
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-text sm:text-3xl">Licensing & Background</h1>
                <p className="mt-1 text-sm text-muted">Manage driver licenses and background checks</p>
            </div>

            <LicensingList
                initialDrivers={data.drivers}
                initialStats={data.stats}
                initialTotal={data.total}
                initialPages={data.pages}
            />
        </div>
    );
}

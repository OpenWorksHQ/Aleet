import type { Driver } from "@/app/components/admin/drivers/driver-types";
import type { ApiDriversStats } from "@/lib/drivers-api";
import { cookies } from "next/headers";
import { fetchAdminDrivers, fetchVehicleTypes } from "@/lib/drivers-api";
import { mapApiDriver } from "@/app/components/admin/drivers/driver-types";
import { DriverStats } from "@/app/components/admin/drivers/driver-stats";
import { DriversTable } from "@/app/components/admin/drivers/drivers-table";

export const metadata = {
    title: "Driver Management — Aleet Admin",
};

export default async function DriversPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? "";

    let drivers: Driver[] = [];
    let stats: ApiDriversStats = { total: 0, approved: 0, pending: 0, rejected: 0 };
    try {
        const [result, vehicleTypes] = await Promise.all([
            fetchAdminDrivers(token),
            fetchVehicleTypes(token),
        ]);
        const vehicleTypeMap = Object.fromEntries(vehicleTypes.map((vt) => [vt._id, vt.name]));
        drivers = result.drivers.map((d) => mapApiDriver(d, vehicleTypeMap));
        stats = result.stats;
        console.log("[DriversPage] stats:", stats);
    } catch {
        // render empty state on error — table handles it
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Heading */}
            <div>
                <h1 className="text-2xl font-bold text-text sm:text-3xl">Driver Management</h1>
                <p className="mt-1 text-sm text-muted">Approve, suspend and manage drivers</p>
            </div>

            {/* Stats strip */}
            <DriverStats stats={stats} />

            {/* Interactive table */}
            <DriversTable initialDrivers={drivers} />
        </div>
    );
}

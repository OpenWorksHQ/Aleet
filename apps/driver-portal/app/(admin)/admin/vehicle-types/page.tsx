import { cookies } from "next/headers";
import { fetchVehicleTypes } from "@/lib/admin-api";
import type { ApiVehicleType } from "@/lib/admin-api";
import { VehicleTypesList } from "@/app/components/admin/vehicle-types/vehicle-types-list";

export default async function VehicleTypesPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";

    let vehicleTypes: ApiVehicleType[] = [];
    try {
        vehicleTypes = await fetchVehicleTypes(token);
    } catch {
        // fallback to empty — shown in UI
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-text sm:text-2xl">Vehicle Types</h1>
                <p className="text-sm text-muted">Manage vehicle types and their pricing</p>
            </div>

            <VehicleTypesList initialVehicleTypes={vehicleTypes} />
        </div>
    );
}

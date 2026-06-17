import { cookies } from "next/headers";
import { fetchAllRegions } from "@/lib/admin-api";
import type { ApiRegion } from "@/lib/admin-api";
import { RegionsList } from "@/app/components/admin/regions/regions-list";

export default async function RegionsPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";

    let regions: ApiRegion[] = [];
    try {
        regions = await fetchAllRegions(token);
    } catch {
        // fallback to empty — shown in UI
    }

    return <RegionsList initialRegions={regions} />;
}

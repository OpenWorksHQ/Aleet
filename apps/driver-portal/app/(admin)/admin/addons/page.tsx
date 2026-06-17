import { cookies } from "next/headers";
import { fetchAddons } from "@/lib/admin-api";
import type { ApiAddon } from "@/lib/admin-api";
import { AddonsList } from "@/app/components/admin/addons/addons-list";

export default async function AddonsPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";

    let addons: ApiAddon[] = [];
    try {
        addons = await fetchAddons(token);
    } catch {
        // fallback to empty — shown in UI
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-text sm:text-2xl">Add-ons</h1>
                <p className="text-sm text-muted">Manage service add-ons and extras</p>
            </div>

            <AddonsList initialAddons={addons} />
        </div>
    );
}

import { cookies } from "next/headers";
import { fetchAdmins } from "@/lib/admin-api";
import type { ApiAdmin } from "@/lib/admin-api";
import { AdminsList } from "@/app/components/admin/administrators/admins-list";
import { ADMIN_ROLES, PERMISSION_LABELS, PERMISSION_COLORS } from "@/app/components/admin/administrators/admin-types";

export const metadata = {
    title: "Administrators — Aleet Admin",
};

export default async function AdministratorsPage() {
    const token = (await cookies()).get("auth_token")?.value ?? "";

    let admins: ApiAdmin[] = [];
    try {
        const result = await fetchAdmins(token);
        admins = result.admins;
    } catch {
        // Fallback to empty list — error shown in UI
    }

    const roleEntries = Object.entries(ADMIN_ROLES);

    return (
        <div className="flex flex-col gap-6">
            {/* Heading */}
            <div>
                <h1 className="text-2xl font-bold text-text sm:text-3xl">Administrators</h1>
                <p className="mt-1 text-sm text-muted">Manage admin accounts and their permissions</p>
            </div>

            {/* Role reference cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {roleEntries.map(([, config]) => (
                    <div key={config.label} className="rounded-2xl border border-border bg-card-bg px-5 py-4">
                        <p className="mb-1 font-semibold text-gold">{config.label}</p>
                        <p className="mb-3 text-xs text-muted">{config.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {config.permissions.map((p) => (
                                <span key={p} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${PERMISSION_COLORS[p]}`}>
                                    {PERMISSION_LABELS[p]}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Interactive list */}
            <AdminsList initialAdmins={admins} />
        </div>
    );
}

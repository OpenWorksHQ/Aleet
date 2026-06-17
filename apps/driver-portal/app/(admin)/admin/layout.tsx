import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AdminSidebar } from "@/app/components/admin/admin-sidebar";
import { AdminHeader } from "@/app/components/admin/admin-header";
import { fetchSidebarStats } from "@/lib/admin-api";
import type { ApiSidebarStats } from "@/lib/admin-api";
import {
    fetchAdminPermissions,
    fetchCurrentUserProfile,
    hasAdminPermission,
} from "@/lib/admin-access";
import { adminNavItems } from "@/app/components/admin/admin-nav-config";

export const metadata = {
    title: "Admin Panel — Aleet",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const token = (await cookies()).get("auth_token")?.value ?? "";
    const [permissions, user] = await Promise.all([
        fetchAdminPermissions(token),
        fetchCurrentUserProfile(token),
    ]);

    let stats: ApiSidebarStats | undefined;
    if (hasAdminPermission(permissions, "view-reports")) {
        try {
            stats = await fetchSidebarStats(token);
        } catch {
            // fallback — badges simply won't show
        }
    }

    return (
        <div className="flex min-h-screen bg-page-bg text-text">
            <AdminSidebar
                stats={stats}
                navItems={adminNavItems}
                permissions={permissions}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <AdminHeader
                    navItems={adminNavItems}
                    permissions={permissions}
                    user={user}
                />
                <main className="flex-1 overflow-y-auto p-6 sm:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

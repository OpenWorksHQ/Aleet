import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/app/components/admin/admin-sidebar";
import { AdminHeader } from "@/app/components/admin/admin-header";
import { fetchSidebarStats } from "@/lib/admin-api";
import type { ApiSidebarStats } from "@/lib/admin-api";
import { hasAdminPermission } from "@/lib/admin-access";
import type { CurrentUserProfile } from "@/lib/admin-access";
import { AUTH_TOKEN_COOKIE } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withUploadToken } from "@/lib/upload-url";
import { adminNavItems } from "@/app/components/admin/admin-nav-config";

export const metadata = {
    title: "Admin Panel — Aleet",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value ?? "";

    // Defense in depth: the proxy already gates /admin, but never rely on it
    // alone — this layout renders the admin shell and must verify for itself.
    const result = await getSession(token);
    if (result.status !== "authenticated") redirect("/login");

    const { session } = result;
    if (session.role !== "admin") {
        redirect(session.role === "driver" ? "/driver" : "/login");
    }

    const permissions = session.adminPermissions;
    const user: CurrentUserProfile = {
        name: session.name || "Admin User",
        role: session.role
            ? session.role.charAt(0).toUpperCase() + session.role.slice(1)
            : "Admin",
        // /uploads is auth-gated and `<img>` cannot send a header — stamp the
        // token here (Server Component: cookie read must come from `cookies()`).
        avatar: withUploadToken(session.avatar, token) || null,
    };

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

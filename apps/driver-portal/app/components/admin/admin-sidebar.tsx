"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AleetLogo } from "@/app/components/ui/aleet-logo";
import { AdminNavIcon } from "./admin-nav-icon";
import type { NavItem } from "./admin-nav-config";
import { cn } from "@/lib/utils";
import type { ApiSidebarStats } from "@/lib/admin-api";
import {
    hasAdminPermission,
    type AdminPermission,
} from "@/lib/admin-access";

type Props = {
    stats?: ApiSidebarStats;
    navItems: NavItem[];
    permissions: AdminPermission[];
};

export function AdminSidebar({ stats, navItems, permissions }: Props) {
    const pathname = usePathname();

    function getBadge(href: string): number | undefined {
        if (!stats) return undefined;
        if (href === "/admin/drivers" && stats.pendingDriverApprovals > 0)
            return stats.pendingDriverApprovals;
        if (href === "/admin/trips" && stats.pendingBookings > 0)
            return stats.pendingBookings;
        return undefined;
    }

    return (
        <aside className="hidden w-82 shrink-0 flex-col border-r border-border bg-card-bg lg:flex">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-5 py-5">
                <AleetLogo className="h-8 w-8" />
                <span className="text-lg font-semibold text-gold">Aleet</span>
            </div>

            {/* Nav */}
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-6">
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);
                    const isLocked =
                        !!item.requiredPermission &&
                        !hasAdminPermission(permissions, item.requiredPermission);
                    const badge = getBadge(item.href);

                    const content = (
                        <>
                            <AdminNavIcon
                                icon={item.icon}
                                className={cn(
                                    isLocked
                                        ? "text-muted/45"
                                        : isActive
                                          ? "text-gold"
                                          : "text-muted group-hover:text-text",
                                )}
                            />
                            <span className="flex-1">{item.label}</span>
                            {item.badge != null && !isLocked && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-[#1a1200]">
                                    {item.badge}
                                </span>
                            )}
                            {badge != null && !isLocked && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-[#1a1200]">
                                    {badge}
                                </span>
                            )}
                            {isLocked && (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4 text-muted/70"
                                    aria-hidden="true"
                                >
                                    <rect x="4" y="11" width="16" height="9" rx="2" />
                                    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                                </svg>
                            )}
                        </>
                    );

                    if (isLocked) {
                        return (
                            <div
                                key={item.href}
                                aria-disabled="true"
                                className="group flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted/55"
                            >
                                {content}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-gold/15 text-gold"
                                    : "text-muted hover:bg-border/40 hover:text-text",
                            )}
                        >
                            {content}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

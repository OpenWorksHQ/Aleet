"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AleetLogo } from "@/app/components/ui/aleet-logo";
import type { NavItem } from "./admin-nav-config";
import { AdminNavIcon } from "./admin-nav-icon";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    hasAdminPermission,
    type AdminPermission,
} from "@/lib/admin-access";
import { disconnectAdminSocket } from "@/lib/admin-socket";

function clearAuthCookies() {
    const expired = "path=/; max-age=0; SameSite=Lax";
    document.cookie = `auth_token=; ${expired}`;
    document.cookie = `auth_role=; ${expired}`;
}

type Props = {
    user: { name: string; role: string; avatar?: string | null };
    navItems: NavItem[];
    permissions: AdminPermission[];
};

export function AdminHeaderClient({ user, navItems, permissions }: Props) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifCount] = useState(2);
    const pathname = usePathname();
    const avatarInitial = user.name.charAt(0).toUpperCase();

    return (
        <>
            <header className="flex h-14 items-center justify-between border-b border-border bg-card-bg px-4 sm:px-6">
                {/* Mobile: brand + hamburger */}
                <div className="flex items-center gap-3 lg:hidden">
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                        className="flex flex-col gap-1.25 p-1 text-muted hover:text-text"
                    >
                        <span className="block h-0.5 w-5 rounded-full bg-current" />
                        <span className="block h-0.5 w-5 rounded-full bg-current" />
                        <span className="block h-0.5 w-5 rounded-full bg-current" />
                    </button>
                    <AleetLogo className="h-7 w-7" />
                    <span className="text-base font-semibold text-gold">Aleet</span>
                </div>

                {/* Desktop: page title area (left) — empty, title is in page */}
                <div className="hidden lg:block" />

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {/* Notification bell */}
                    <button
                        aria-label="Notifications"
                        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-border/40 hover:text-text"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {notifCount > 0 && (
                            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-[#1a1200]">
                                {notifCount}
                            </span>
                        )}
                    </button>

                    {/* User info */}
                    <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-1.5">
                        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gold/20 text-xs font-bold text-gold">
                            {user.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt={`${user.name} avatar`}
                                    width={28}
                                    height={28}
                                    unoptimized
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                avatarInitial
                            )}
                        </div>
                        <div className="hidden flex-col sm:flex">
                            <span className="text-[13px] font-medium text-text leading-none">{user.name}</span>
                            <span className="text-[11px] text-muted leading-none mt-0.5">{user.role}</span>
                        </div>
                        {/* Logout */}
                        <button
                            onClick={() => { disconnectAdminSocket(); clearAuthCookies(); window.location.href = "/login"; }}
                            aria-label="Sign out"
                            className="ml-1 text-muted hover:text-gold transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card-bg">
                        <div className="flex items-center justify-between px-5 py-5">
                            <div className="flex items-center gap-2.5">
                                <AleetLogo className="h-8 w-8" />
                                <span className="text-lg font-semibold text-gold">Aleet</span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                aria-label="Close menu"
                                className="text-muted hover:text-text"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-6">
                            {navItems.map((item) => {
                                const isActive =
                                    item.href === "/admin"
                                        ? pathname === "/admin"
                                        : pathname.startsWith(item.href);
                                const isLocked =
                                    !!item.requiredPermission &&
                                    !hasAdminPermission(permissions, item.requiredPermission);

                                const content = (
                                    <>
                                        <AdminNavIcon
                                            icon={item.icon}
                                            className={cn(
                                                isLocked
                                                    ? "text-muted/45"
                                                    : isActive
                                                      ? "text-gold"
                                                      : "text-muted",
                                            )}
                                        />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge != null && !isLocked && (
                                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-[#1a1200]">
                                                {item.badge}
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
                                        onClick={() => setMobileOpen(false)}
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
                </div>
            )}
        </>
    );
}

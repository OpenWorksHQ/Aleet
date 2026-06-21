"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { AleetLogo } from "@/app/components/ui/aleet-logo";
import { DriverNavIcon } from "./driver-nav-icon";
import { driverNavItems } from "./driver-nav-config";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/components/theme-provider";
import { useUserStore } from "@/lib/user-store";
import { disconnectDriverSocket } from "@/lib/socket";
import { sendPresenceOffline } from "@/lib/presence-api";

const STATUS_LABEL: Record<string, string> = {
    active: "Active",
    approved: "Approved",
    background_completed: "Under Review",
    needs_revision: "Needs Revision",
    revision_complete: "Under Review",
    submitted: "Pending Review",
};

const STATUS_STYLE: Record<string, string> = {
    active: "border-gold/30 bg-gold/10 text-gold",
    approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    background_completed: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    needs_revision: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    revision_complete: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    submitted: "border-muted/30 bg-muted/10 text-muted",
};

const STATUS_DOT: Record<string, string> = {
    active: "bg-gold animate-pulse",
    approved: "bg-emerald-400 animate-pulse",
    background_completed: "bg-blue-400",
    needs_revision: "bg-amber-400",
    revision_complete: "bg-purple-400 animate-pulse",
    submitted: "bg-muted",
};

type NotifType = "info" | "success" | "warning";

interface Notification {
    id: number;
    type: NotifType;
    title: string;
    description: string;
    time: string;
    unread: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 1, type: "info", title: "New trip available", description: "High-value trip in your area", time: "2 min ago", unread: true },
    { id: 2, type: "success", title: "Payment processed", description: "Weekly earnings deposited", time: "1 hour ago", unread: true },
    { id: 3, type: "warning", title: "Document expiring", description: "License expires in 30 days", time: "2 hours ago", unread: false },
    { id: 4, type: "info", title: "System maintenance", description: "Scheduled for tonight 2–4 AM", time: "4 hours ago", unread: false },
];

const NOTIF_ICON: Record<NotifType, React.ReactNode> = {
    info: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-400">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    success: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    warning: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-400">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
};

const NOTIF_BG: Record<NotifType, string> = {
    info: "bg-blue-400/10",
    success: "bg-emerald-400/10",
    warning: "bg-amber-400/10",
};

function clearAuthCookies() {
    const expired = "path=/; max-age=0; SameSite=Lax";
    document.cookie = `auth_token=; ${expired}`;
    document.cookie = `auth_role=; ${expired}`;
}

export function DriverHeaderClient() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const notifRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const unreadCount = notifications.filter((n) => n.unread).length;
    const profile = useUserStore((s) => s.profile);
    const isLoading = useUserStore((s) => s.isLoading);
    const driverStatus = profile?.driverStatus ?? "";
    const rawName = profile?.name ?? "";
    const displayName = (() => {
        const parts = rawName.trim().split(/\s+/);
        if (parts.length < 2) return rawName;
        return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    })();
    const displayRole = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Driver";
    const avatarUrl = profile?.avatar ?? null;

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

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

                <div className="hidden lg:block" />

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {/* Driver status badge */}
                    {isLoading ? (
                        <div className="hidden sm:block h-6 w-24 animate-pulse rounded-full bg-border/50" />
                    ) : (
                        <span className={`hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[driverStatus] ?? "border-muted/30 bg-muted/10 text-muted"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[driverStatus] ?? "bg-muted"}`} />
                            {STATUS_LABEL[driverStatus] ?? driverStatus}
                        </span>
                    )}

                    {/* Notification bell */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => setNotifOpen((v) => !v)}
                            aria-label="Notifications"
                            className="relative rounded-lg p-2 text-muted transition-colors hover:bg-border/40 hover:text-text"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-[#1a1200]">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {notifOpen && (
                            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card-bg shadow-xl">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                    <span className="text-sm font-semibold text-text">Notifications</span>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllRead}
                                                className="text-[11px] text-gold hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setNotifOpen(false)}
                                            className="text-muted hover:text-text transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                                                <path d="M18 6 6 18M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={cn(
                                                "flex items-start gap-3 border-b border-border px-4 py-3 last:border-none transition-colors",
                                                n.unread ? "bg-gold/3" : "",
                                            )}
                                        >
                                            <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", NOTIF_BG[n.type])}>
                                                {NOTIF_ICON[n.type]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium leading-snug", n.unread ? "text-text" : "text-muted")}>{n.title}</p>
                                                <p className="mt-0.5 text-xs text-muted">{n.description}</p>
                                                <p className="mt-1 text-[11px] text-muted/60">{n.time}</p>
                                            </div>
                                            {n.unread && (
                                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme toggle */}
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label="Toggle theme"
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-border/40 hover:text-text"
                    >
                        {theme === "dark" ? (
                            /* Sun — switch to light */
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            /* Moon — switch to dark */
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {/* User info */}
                    <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-1.5">
                        {isLoading ? (
                            <div className="h-7 w-7 animate-pulse rounded-full bg-border/50 shrink-0" />
                        ) : (
                            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gold/20 text-xs font-bold text-gold">
                                {avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt={`${displayName} avatar`}
                                        width={28}
                                        height={28}
                                        unoptimized
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    displayName.charAt(0)
                                )}
                            </div>
                        )}
                        <div className="hidden flex-col sm:flex">
                            {isLoading ? (
                                <div className="space-y-1.5">
                                    <div className="h-3 w-24 animate-pulse rounded bg-border/50" />
                                    <div className="h-2.5 w-16 animate-pulse rounded bg-border/50" />
                                </div>
                            ) : (
                                <>
                                    <span className="text-[13px] font-medium text-text leading-none">{displayName}</span>
                                    <span className="text-[11px] text-muted leading-none mt-0.5">{displayRole}</span>
                                </>
                            )}
                        </div>
                        {/* Logout */}
                        <button
                            onClick={async () => {
                                await sendPresenceOffline();
                                disconnectDriverSocket();
                                clearAuthCookies();
                                window.location.href = "/login";
                            }}
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
                            {driverNavItems.map((item) => {
                                const isActive = item.href === "/driver"
                                    ? pathname === "/driver"
                                    : pathname.startsWith(item.href);

                                if (item.locked) {
                                    return (
                                        <div
                                            key={item.href}
                                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted/50 cursor-not-allowed select-none"
                                        >
                                            <DriverNavIcon icon={item.icon} className="text-muted/40" />
                                            <span className="flex-1">{item.label}</span>
                                            <Lock className="h-3.5 w-3.5 text-muted/40" />
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
                                        <DriverNavIcon icon={item.icon} className={isActive ? "text-gold" : "text-muted"} />
                                        <span className="flex-1">{item.label}</span>
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

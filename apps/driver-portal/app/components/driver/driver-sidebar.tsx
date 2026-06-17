"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { AleetLogo } from "@/app/components/ui/aleet-logo";
import { DriverNavIcon } from "./driver-nav-icon";
import { driverNavItems } from "./driver-nav-config";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/user-store";

const FULLY_APPROVED = new Set(["active", "approved"]);

export function DriverSidebar() {
    const pathname = usePathname();
    const driverStatus = useUserStore((s) => s.profile?.driverStatus ?? "");
    const isFullyApproved = FULLY_APPROVED.has(driverStatus);

    return (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card-bg lg:flex">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-5 py-5">
                <AleetLogo className="h-8 w-8" />
                <span className="text-lg font-semibold text-gold">Aleet</span>
            </div>

            {/* Nav */}
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-6">
                {driverNavItems.map((item) => {
                    const effectiveLocked = item.locked || (item.requiresApproval && !isFullyApproved);
                    const isActive = item.href === "/driver"
                        ? pathname === "/driver"
                        : pathname.startsWith(item.href);

                    if (effectiveLocked) {
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
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-gold/15 text-gold"
                                    : "text-muted hover:bg-border/40 hover:text-text",
                            )}
                        >
                            <DriverNavIcon
                                icon={item.icon}
                                className={isActive ? "text-gold" : "text-muted group-hover:text-text"}
                            />
                            <span className="flex-1">{item.label}</span>
                            {item.badge != null && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-[#1a1200]">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

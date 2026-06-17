"use client";

import { useRef, useState, useLayoutEffect, useEffect, type JSX } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    DashboardIcon,
    TripHistoryIcon,
    BookTripIcon,
    PaymentsIcon,
    SubscriptionIcon,
} from "@/app/components/ui/icons";

type NavItem = {
    key: string;
    label: string;
    icon: (props: { className?: string }) => JSX.Element;
};

const NAV_ITEMS: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: DashboardIcon },
    { key: "history", label: "Trip History", icon: TripHistoryIcon },
    { key: "book", label: "Book Trip", icon: BookTripIcon },
    { key: "payments", label: "Payments & Billing", icon: PaymentsIcon },
    { key: "subscription", label: "Subscription", icon: SubscriptionIcon },
];

export function SideNav({ initialActive = "dashboard" }: { initialActive?: string }) {
    const router = useRouter();
    const [active, setActive] = useState(initialActive);
    const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number } | null>(null);
    const [animated, setAnimated] = useState(false);
    const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // On first render — set position instantly (no transition)
    useLayoutEffect(() => {
        const el = itemRefs.current.get(active);
        if (el) {
            setIndicatorStyle({ top: el.offsetTop, height: el.offsetHeight });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // After mount — enable transition
    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleSelect = (key: string) => {
        // Update indicator first so animation plays, then navigate
        setActive(key);
        const el = itemRefs.current.get(key);
        if (el) {
            setIndicatorStyle({ top: el.offsetTop, height: el.offsetHeight });
        }

        const routes: Record<string, string> = {
            book: "/booking",
            history: "/trip-history",
            dashboard: "/dashboard",
            payments: "/billing",
            subscription: "/subscription",
        };
        if (routes[key]) {
            // Delay navigation to let the slide animation finish (300ms = transition duration)
            setTimeout(() => router.push(routes[key]), 280);
        }
    };

    return (
        <nav className="relative flex flex-col gap-1 w-full min-w-0" aria-label="Dashboard navigation">
            {/* Sliding indicator */}
            {indicatorStyle && (
                <div
                    className={cn(
                        "pointer-events-none absolute left-0 right-0 hidden lg:block",
                        "rounded-xl border border-[#bca066]/25 bg-linear-to-r from-[#bca066]/15 to-[#bca066]/5",
                        animated ? "transition-all duration-300 ease-in-out" : "",
                    )}
                    style={{ top: indicatorStyle.top, height: indicatorStyle.height }}
                />
            )}

            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                    <button
                        key={key}
                        ref={(el) => {
                            if (el) itemRefs.current.set(key, el);
                            else itemRefs.current.delete(key);
                        }}
                        type="button"
                        onClick={() => handleSelect(key)}
                        className={cn(
                            "relative inline-flex w-full flex-col items-center cursor-pointer justify-center gap-1 rounded-xl px-1.5 py-2 text-center transition-colors duration-200 lg:aspect-square",
                            isActive ? "text-[#bca066]" : "text-[#5a6a6b] hover:text-white/70",
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-[11px] leading-tight font-medium w-full truncate">{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

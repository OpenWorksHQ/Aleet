"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Flag, Navigation } from "lucide-react";
import { EditIcon, PhoneIcon } from "@/app/components/ui/icons";

type TripTab = "active" | "upcoming" | "completed";

type TripData = {
    date: string;
    badge: string;
    badgeVariant: "active" | "upcoming" | "completed";
    meta: string;
    pickupTitle: string;
    pickupText: string;
    stopTitle?: string;
    stopText?: string;
    dropoffTitle?: string;
    dropoffText?: string;
    driver: string;
    car: string;
};

const MOCK_TRIPS: Record<TripTab, TripData[]> = {
    active: [
        {
            date: "Apr 21, 2026 at 10:00 AM",
            badge: "Active",
            badgeVariant: "active",
            meta: "Trip is in progress",
            pickupTitle: "Pickup",
            pickupText: "Grand Hyatt Hotel, Midtown",
            stopTitle: "Stops (1)",
            stopText: "Union Square",
            dropoffTitle: "Drop-off",
            dropoffText: "JFK International Airport",
            driver: "James Carter",
            car: "Cadillac Escalade",
        },
    ],
    upcoming: [
        {
            date: "Dec 15, 2025 at 9:00 AM",
            badge: "Upcoming",
            badgeVariant: "upcoming",
            meta: "Trip starts in 2 days",
            pickupTitle: "Pickup",
            pickupText: "123 Business District, Downtown",
            stopTitle: "Stops (1)",
            stopText: "Coffee Shop on 5th St",
            dropoffTitle: "Drop-off",
            dropoffText: "Airport Terminal 1",
            driver: "Michael Johnson",
            car: "Mercedes S-Class",
        },
        {
            date: "Dec 18, 2025 at 2:30 PM",
            badge: "Upcoming",
            badgeVariant: "upcoming",
            meta: "Trip starts in 5 days",
            pickupTitle: "Pickup",
            pickupText: "Home - 456 Oak Avenue",
            dropoffTitle: "Drop-off",
            dropoffText: "City Conference Center",
            driver: "Sarah Williams",
            car: "BMW 7 Series",
        },
    ],
    completed: [
        {
            date: "Apr 10, 2026 at 8:00 AM",
            badge: "Completed",
            badgeVariant: "completed",
            meta: "Trip completed",
            pickupTitle: "Pickup",
            pickupText: "Ritz-Carlton, Central Park",
            dropoffTitle: "Drop-off",
            dropoffText: "LaGuardia Airport",
            driver: "David Kim",
            car: "Lincoln Navigator",
        },
        {
            date: "Mar 28, 2026 at 3:15 PM",
            badge: "Completed",
            badgeVariant: "completed",
            meta: "Trip completed",
            pickupTitle: "Pickup",
            pickupText: "Brooklyn Bridge Park",
            stopTitle: "Stops (2)",
            stopText: "SoHo, Chelsea Market",
            dropoffTitle: "Drop-off",
            dropoffText: "Newark Liberty Airport",
            driver: "Elena Rossi",
            car: "Mercedes S-Class",
        },
    ],
};

const BADGE_STYLES: Record<TripData["badgeVariant"], string> = {
    active: "bg-[#bca066] text-[#252728]",
    upcoming: "bg-[#bca066] text-[#252728]",
    completed: "bg-white/10 text-white/60",
};

const TAB_BADGE_STYLES: Record<TripTab, { active: string; inactive: string }> = {
    active: {
        active: "bg-[#bca066]/20 text-[#bca066]",
        inactive: "bg-white/5 text-white/30",
    },
    upcoming: {
        active: "bg-[#bca066]/20 text-[#bca066]",
        inactive: "bg-white/5 text-white/30",
    },
    completed: {
        active: "bg-white/10 text-white/60",
        inactive: "bg-white/5 text-white/30",
    },
};

export function TripsSection() {
    const [tab, setTab] = useState<TripTab>("upcoming");

    const trips = MOCK_TRIPS[tab];

    const tabs: { key: TripTab; label: string }[] = [
        { key: "active", label: "Active" },
        { key: "upcoming", label: "Upcoming" },
        { key: "completed", label: "Completed" },
    ];

    const totalLabel = tabs.find((t) => t.key === tab)?.label ?? "";

    return (
        <section className="rounded-2xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)]">
            <header className="border-b border-[#1e2b2c] px-3 py-4 sm:px-6">
                {/* Tabs */}
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#1e2a2c] bg-[#0c1211] p-1">
                    {tabs.map(({ key, label }) => {
                        const isActive = tab === key;
                        const badgeStyle = isActive
                            ? TAB_BADGE_STYLES[key].active
                            : TAB_BADGE_STYLES[key].inactive;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key)}
                                className={cn(
                                    "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold transition-colors duration-150 sm:gap-2 sm:px-4 sm:text-[13px]",
                                    isActive ? "bg-[#1e2a2c] text-white" : "text-white/40 hover:text-white/70",
                                )}
                            >
                                <span className="truncate">{label}</span>
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", badgeStyle)}>
                                    {MOCK_TRIPS[key].length}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {trips.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-white/30">
                    No {totalLabel.toLowerCase()} trips.
                </p>
            ) : (
                <div className="grid gap-3 p-3 lg:grid-cols-2">
                    {trips.map((trip, i) => (
                        <TripCard key={i} {...trip} />
                    ))}
                </div>
            )}
        </section>
    );
}

function TripCard({
    date,
    badge,
    badgeVariant,
    meta,
    pickupTitle,
    pickupText,
    stopTitle,
    stopText,
    dropoffTitle,
    dropoffText,
    driver,
    car,
}: TripData) {
    return (
        <article className="overflow-hidden rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)]">
            <div className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{date}</p>
                    <EditIcon className="h-4 w-4 text-[#7f8687]" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", BADGE_STYLES[badgeVariant])}>
                        {badge}
                    </span>
                    <span className="text-xs text-[#9ca3a4]">{meta}</span>
                </div>

                <TripPoint icon={<Navigation className="h-3.5 w-3.5" />} title={pickupTitle} text={pickupText} />
                {stopTitle ? <TripPoint icon={<MapPin className="h-3.5 w-3.5" />} title={stopTitle} text={stopText ?? ""} /> : null}
                {dropoffTitle ? <TripPoint icon={<Flag className="h-3.5 w-3.5" />} title={dropoffTitle} text={dropoffText ?? ""} /> : null}
            </div>

            <footer className="flex flex-col gap-3 border-t border-[#1e2b2c] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(160deg,#d1d5db,#9ca3af)] text-xs font-semibold text-[#1f2937]">
                        {driver
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-base font-medium text-[#bca066]">{driver}</p>
                        <p className="truncate text-xs text-[#d1d5db]">{car}</p>
                        <p className="text-[11px] text-[#d1d5db]">★ 4.9</p>
                    </div>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-[#bca066]"
                >
                    <PhoneIcon className="h-4 w-4" />
                    Contact
                </button>
            </footer>
        </article>
    );
}

function TripPoint({ icon, title, text }: { icon?: React.ReactNode; title: string; text: string }) {
    return (
        <div className="flex items-start gap-2.5">
            {icon && <span className="mt-0.5 shrink-0 text-[#5a7080]">{icon}</span>}
            <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-[#d1d5db]">{text}</p>
            </div>
        </div>
    );
}

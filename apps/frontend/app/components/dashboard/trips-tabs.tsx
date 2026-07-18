"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Flag, Navigation, Loader2 } from "lucide-react";
import { EditIcon, PhoneIcon } from "@/app/components/ui/icons";
import { getToken } from "@/lib/auth";
import { toTelHref } from "@/lib/phone";
import {
    fetchActiveTrips,
    fetchCompletedTrips,
    fetchUpcomingTrips,
    type DashboardTrip,
} from "@/lib/api/dashboard-trips";

type TripTab = "active" | "upcoming" | "completed";

type TripCardData = {
    id: string;
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
    driverPhone: string | null;
    rating?: number | null;
};

const BADGE_STYLES: Record<TripCardData["badgeVariant"], string> = {
    active: "bg-aleet-gold text-aleet-text",
    upcoming: "bg-aleet-gold text-aleet-text",
    completed: "bg-aleet-cream text-aleet-text-muted",
};

const TAB_BADGE_STYLES: Record<TripTab, { active: string; inactive: string }> = {
    active: {
        active: "bg-aleet-gold/20 text-aleet-gold",
        inactive: "bg-aleet-cream text-aleet-text-subtle",
    },
    upcoming: {
        active: "bg-aleet-gold/20 text-aleet-gold",
        inactive: "bg-aleet-cream text-aleet-text-subtle",
    },
    completed: {
        active: "bg-aleet-cream text-aleet-text-muted",
        inactive: "bg-aleet-cream text-aleet-text-subtle",
    },
};

function formatTripDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function daysUntil(iso: string) {
    const start = new Date(iso).getTime();
    if (Number.isNaN(start)) return null;
    const diff = Math.ceil((start - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
}

function mapTrip(trip: DashboardTrip, variant: TripCardData["badgeVariant"]): TripCardData {
    let meta = "";
    if (variant === "active") {
        meta =
            trip.timeRemaining != null
                ? `About ${trip.timeRemaining} min remaining`
                : "Trip is in progress";
    } else if (variant === "upcoming") {
        const days = daysUntil(trip.startDate);
        if (days == null) meta = "Upcoming trip";
        else if (days <= 0) meta = "Trip starts today";
        else if (days === 1) meta = "Trip starts in 1 day";
        else meta = `Trip starts in ${days} days`;
    } else {
        meta = "Trip completed";
    }

    return {
        id: trip.id,
        date: formatTripDate(trip.startDate),
        badge: variant === "active" ? "Active" : variant === "upcoming" ? "Upcoming" : "Completed",
        badgeVariant: variant,
        meta,
        pickupTitle: "Pickup",
        pickupText: trip.pickupLocation,
        dropoffTitle: trip.dropoffLocation ? "Drop-off" : undefined,
        dropoffText: trip.dropoffLocation ?? undefined,
        driver: trip.driver?.name?.trim() || "Driver unassigned",
        car: trip.vehicleType?.name ?? "Vehicle TBD",
        driverPhone: trip.driver?.phone ?? null,
        rating: trip.rating,
    };
}

export function TripsSection() {
    const [tab, setTab] = useState<TripTab>("upcoming");
    const [tripsByTab, setTripsByTab] = useState<Record<TripTab, TripCardData[]>>({
        active: [],
        upcoming: [],
        completed: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = getToken();
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            setError(null);
            try {
                const [activeRes, upcomingRes, completedRes] = await Promise.all([
                    fetchActiveTrips(token ?? undefined),
                    fetchUpcomingTrips(token ?? undefined),
                    fetchCompletedTrips(token ?? undefined),
                ]);

                if (cancelled) return;

                setTripsByTab({
                    active: (activeRes.data?.trips ?? []).map((t) => mapTrip(t, "active")),
                    upcoming: (upcomingRes.data?.trips ?? []).map((t) => mapTrip(t, "upcoming")),
                    completed: (completedRes.data?.trips ?? []).map((t) => mapTrip(t, "completed")),
                });
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Failed to load trips");
                    setTripsByTab({ active: [], upcoming: [], completed: [] });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const trips = tripsByTab[tab];

    const tabs: { key: TripTab; label: string }[] = [
        { key: "active", label: "Active" },
        { key: "upcoming", label: "Upcoming" },
        { key: "completed", label: "Completed" },
    ];

    const totalLabel = tabs.find((t) => t.key === tab)?.label ?? "";

    return (
        <section className="rounded-2xl border border-aleet-border bg-aleet-card shadow-sm">
            <header className="border-b border-aleet-border px-3 py-4 sm:px-6">
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-aleet-border bg-aleet-card p-1">
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
                                    isActive ? "bg-aleet-cream text-aleet-text" : "text-aleet-text-muted hover:text-aleet-text",
                                )}
                            >
                                <span className="truncate">{label}</span>
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", badgeStyle)}>
                                    {tripsByTab[key].length}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-aleet-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading trips…
                </div>
            ) : error ? (
                <p className="py-10 text-center text-[13px] text-red-500">{error}</p>
            ) : trips.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-aleet-text-subtle">
                    No {totalLabel.toLowerCase()} trips.
                </p>
            ) : (
                <div className="grid gap-3 p-3 lg:grid-cols-2">
                    {trips.map((trip) => (
                        <TripCard key={trip.id} {...trip} />
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
    driverPhone,
    rating,
}: TripCardData) {
    const telHref = toTelHref(driverPhone);

    return (
        <article className="overflow-hidden rounded-2xl border border-aleet-border bg-aleet-card">
            <div className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-aleet-text">{date}</p>
                    <EditIcon className="h-4 w-4 text-aleet-text-subtle" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", BADGE_STYLES[badgeVariant])}>
                        {badge}
                    </span>
                    <span className="text-xs text-aleet-text-muted">{meta}</span>
                </div>

                <TripPoint icon={<Navigation className="h-3.5 w-3.5" />} title={pickupTitle} text={pickupText} />
                {stopTitle ? <TripPoint icon={<MapPin className="h-3.5 w-3.5" />} title={stopTitle} text={stopText ?? ""} /> : null}
                {dropoffTitle ? <TripPoint icon={<Flag className="h-3.5 w-3.5" />} title={dropoffTitle} text={dropoffText ?? ""} /> : null}
            </div>

            <footer className="flex flex-col gap-3 border-t border-aleet-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(160deg,#d1d5db,#9ca3af)] text-xs font-semibold text-[#1f2937]">
                        {driver
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-base font-medium text-aleet-gold">{driver}</p>
                        <p className="truncate text-xs text-aleet-text-muted">{car}</p>
                        {rating != null && rating > 0 ? (
                            <p className="text-[11px] text-aleet-text-muted">★ {rating.toFixed(1)}</p>
                        ) : null}
                    </div>
                </div>

                {telHref ? (
                    <a
                        href={telHref}
                        className="inline-flex items-center gap-2 text-sm font-medium text-aleet-text transition-colors hover:text-aleet-gold"
                    >
                        <PhoneIcon className="h-4 w-4" />
                        Contact
                    </a>
                ) : (
                    <span
                        className="inline-flex cursor-not-allowed items-center gap-2 text-sm font-medium text-aleet-text-subtle"
                        title="Driver phone not available yet"
                    >
                        <PhoneIcon className="h-4 w-4" />
                        Contact
                    </span>
                )}
            </footer>
        </article>
    );
}

function TripPoint({ icon, title, text }: { icon?: React.ReactNode; title: string; text: string }) {
    return (
        <div className="flex items-start gap-2.5">
            {icon && <span className="mt-0.5 shrink-0 text-aleet-text-subtle">{icon}</span>}
            <div>
                <p className="text-sm font-semibold text-aleet-text">{title}</p>
                <p className="text-xs text-aleet-text-muted">{text}</p>
            </div>
        </div>
    );
}

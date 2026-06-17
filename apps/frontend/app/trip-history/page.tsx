"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteMenu } from "../components/site-menu";
import { SideNav } from "@/app/components/dashboard/side-nav";
import { cn } from "@/lib/utils";
import { fetchMyBookings, type MyBooking } from "@/lib/api/my-bookings";
import { getToken } from "@/lib/auth";

const MOCK_BOOKINGS: MyBooking[] = [
    {
        _id: "1",
        status: "active",
        region: "New York",
        pickupLocation: "Grand Hyatt Hotel, Midtown Manhattan",
        dropoffLocation: "JFK International Airport",
        freeRouting: false,
        dates: { startDate: "2026-04-21T10:00:00Z", endDate: "2026-04-21T12:30:00Z" },
        vehicleType: { _id: "v1", name: "Cadillac Escalade", description: "", hourlyPrice: 120 },
        quantity: 1,
        stops: [{ location: "Union Square" }, { location: "Brooklyn Bridge" }],
        assignedDriver: { name: "James Carter" },
        addOns: [{ _id: "a2", name: "Meet & Greet", description: "", type: "paid", price: 40 }],
        regularPrice: 320,
        finalPrice: 340,
        savings: 0,
        paymentStatus: "paid",
        bookingDate: "2026-04-18T10:00:00Z",
        createdAt: "2026-04-18T10:00:00Z",
    },
    {
        _id: "2",
        status: "upcoming",
        region: "New York",
        pickupLocation: "123 Business District, Downtown",
        dropoffLocation: "Airport Terminal 1",
        freeRouting: false,
        dates: { startDate: "2025-12-15T09:00:00Z", endDate: "2025-12-15T11:00:00Z" },
        vehicleType: { _id: "v4", name: "Mercedes S-Class", description: "", hourlyPrice: 150 },
        quantity: 1,
        stops: [{ location: "Coffee Shop on 5th St" }],
        assignedDriver: { name: "Michael Johnson" },
        addOns: [],
        regularPrice: 300,
        finalPrice: 300,
        savings: 0,
        paymentStatus: "pending",
        bookingDate: "2025-12-10T10:00:00Z",
        createdAt: "2025-12-10T10:00:00Z",
    },
    {
        _id: "3",
        status: "upcoming",
        region: "New York",
        pickupLocation: "Home - 456 Oak Avenue",
        dropoffLocation: "City Conference Center",
        freeRouting: false,
        dates: { startDate: "2025-12-18T14:30:00Z", endDate: "2025-12-18T16:00:00Z" },
        vehicleType: { _id: "v2", name: "BMW 7 Series", description: "", hourlyPrice: 130 },
        quantity: 1,
        stops: [],
        assignedDriver: { name: "Sarah Williams" },
        addOns: [],
        regularPrice: 200,
        finalPrice: 195,
        savings: 5,
        paymentStatus: "pending",
        bookingDate: "2025-12-12T09:00:00Z",
        createdAt: "2025-12-12T09:00:00Z",
    },
    {
        _id: "4",
        status: "completed",
        region: "New York",
        pickupLocation: "Ritz-Carlton, Central Park",
        dropoffLocation: "LaGuardia Airport",
        freeRouting: false,
        dates: { startDate: "2026-04-10T08:00:00Z", endDate: "2026-04-10T09:45:00Z" },
        vehicleType: { _id: "v3", name: "Lincoln Navigator", description: "", hourlyPrice: 110 },
        quantity: 1,
        stops: [],
        assignedDriver: { name: "David Kim" },
        addOns: [],
        regularPrice: 220,
        finalPrice: 220,
        savings: 0,
        paymentStatus: "paid",
        bookingDate: "2026-04-08T11:00:00Z",
        createdAt: "2026-04-08T11:00:00Z",
    },
    {
        _id: "5",
        status: "completed",
        region: "New York",
        pickupLocation: "Brooklyn Bridge Park",
        dropoffLocation: "Newark Liberty Airport",
        freeRouting: false,
        dates: { startDate: "2026-03-28T15:15:00Z", endDate: "2026-03-28T17:30:00Z" },
        vehicleType: { _id: "v2", name: "Mercedes S-Class", description: "", hourlyPrice: 150 },
        quantity: 1,
        stops: [{ location: "SoHo" }, { location: "Chelsea Market" }],
        assignedDriver: { name: "Elena Rossi" },
        addOns: [{ _id: "a1", name: "Child Seat", description: "", type: "paid", price: 25 }],
        regularPrice: 380,
        finalPrice: 405,
        savings: 0,
        paymentStatus: "paid",
        bookingDate: "2026-03-25T14:00:00Z",
        createdAt: "2026-03-25T14:00:00Z",
    },
    {
        _id: "6",
        status: "cancelled",
        region: "New York",
        pickupLocation: "Times Square Hotel",
        dropoffLocation: "Brooklyn Navy Yard",
        freeRouting: false,
        dates: { startDate: "2026-02-14T18:00:00Z", endDate: "2026-02-14T19:30:00Z" },
        vehicleType: { _id: "v1", name: "Cadillac Escalade", description: "", hourlyPrice: 120 },
        quantity: 1,
        stops: [],
        assignedDriver: null,
        addOns: [],
        regularPrice: 180,
        finalPrice: 0,
        savings: 180,
        paymentStatus: "refunded",
        bookingDate: "2026-02-12T10:00:00Z",
        createdAt: "2026-02-12T10:00:00Z",
    },
];

const STATUS_STYLES: Record<string, string> = {
    active: "bg-[#bca066] text-[#252728]",
    upcoming: "bg-[#bca066] text-[#252728]",
    completed: "bg-white/10 text-white/60",
    cancelled: "bg-red-900/30 text-red-400",
};

function statusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function BookingCard({ booking }: { booking: MyBooking }) {
    const badgeStyle = STATUS_STYLES[booking.status] ?? "bg-white/10 text-white/60";

    return (
        <article className="overflow-hidden rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)]">
            <div className="space-y-4 px-5 py-5">
                {/* Date + status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                        {formatDate(booking.dates.startDate)}
                    </p>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", badgeStyle)}>
                        {statusLabel(booking.status)}
                    </span>
                </div>

                {/* Route */}
                <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-[#5a7080]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 2L12 22M5 9l7-7 7 7" /></svg>
                        </span>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Pickup</p>
                            <p className="text-sm text-white">{booking.pickupLocation}</p>
                        </div>
                    </div>
                    {booking.stops.length > 0 && (
                        <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 text-[#5a7080]">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
                            </span>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                                    Stops ({booking.stops.length})
                                </p>
                                <p className="text-sm text-white">{booking.stops.map((s) => s.location).join(", ")}</p>
                            </div>
                        </div>
                    )}
                    {booking.dropoffLocation && (
                        <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 text-[#5a7080]">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 22V2M5 15l7 7 7-7" /></svg>
                            </span>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Drop-off</p>
                                <p className="text-sm text-white">{booking.dropoffLocation}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vehicle + price */}
                <div className="flex items-center justify-between gap-3 border-t border-[#1e2b2c] pt-4">
                    <div>
                        <p className="text-sm font-medium text-[#bca066]">{booking.vehicleType.name}</p>
                        <p className="text-xs text-white/40">
                            {formatDate(booking.dates.startDate)} — {formatDate(booking.dates.endDate)}
                        </p>
                    </div>
                    <p className="text-lg font-semibold text-white">${booking.finalPrice.toFixed(2)}</p>
                </div>
            </div>
        </article>
    );
}

export default function TripHistoryPage() {
    const [bookings, setBookings] = useState<MyBooking[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        const token = getToken();
        fetchMyBookings(token ?? undefined)
            .then((res) => setBookings(res.data?.length ? res.data : MOCK_BOOKINGS))
            .catch(() => setBookings(MOCK_BOOKINGS))
            .finally(() => setIsLoading(false));
    }, []);

    const statuses = ["all", "upcoming", "active", "completed", "cancelled"];

    const filtered = filter === "all"
        ? (bookings ?? [])
        : (bookings ?? []).filter((b) => b.status === filter);

    return (
        <div className="min-h-screen bg-[#050d0c] pb-10 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-white/6 bg-[#050d0c]">
                <div className="flex h-14 w-full items-center justify-between px-4 sm:h-16 sm:px-8">
                    <SiteMenu />
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 text-[#bca066] no-underline"
                        aria-label="Aleet home"
                    >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#bca066] font-serif text-[18px] leading-none font-semibold sm:h-9 sm:w-9 sm:text-[20px]">
                            A
                        </span>
                        <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] sm:text-[26px]">
                            Aleet
                        </span>
                    </Link>
                    <div className="w-9 sm:w-10" />
                </div>
            </header>

            <main className="mx-auto mt-8 w-full px-5 sm:px-10">
                <section className="grid gap-4 lg:grid-cols-[92px_1fr]">
                    <aside className="overflow-hidden rounded-xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)] p-1.5">
                        <SideNav initialActive="history" />
                    </aside>

                    <section className="min-w-0 space-y-4">
                        {/* Page title */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-white sm:text-3xl">Trip History</h1>
                                <p className="mt-1 text-sm text-white/40">All your past and upcoming bookings</p>
                            </div>
                        </div>

                        {/* Filter tabs */}
                        <div className="overflow-x-auto rounded-xl border border-[#1e2a2c] bg-[#0c1211] p-1">
                            <div className="flex min-w-max gap-1">
                                {statuses.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setFilter(s)}
                                        className={cn(
                                            "flex shrink-0 items-center justify-center rounded-lg px-3 py-2 text-[12px] font-semibold capitalize whitespace-nowrap transition-colors duration-150",
                                            filter === s ? "bg-[#1e2a2c] text-white" : "text-white/40 hover:text-white/70",
                                        )}
                                    >
                                        {s}
                                        {bookings && s !== "all" && (
                                            <span className={cn(
                                                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                                filter === s ? "bg-[#bca066]/20 text-[#bca066]" : "bg-white/5 text-white/30",
                                            )}>
                                                {bookings.filter((b) => b.status === s).length}
                                            </span>
                                        )}
                                        {bookings && s === "all" && (
                                            <span className={cn(
                                                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                                filter === s ? "bg-[#bca066]/20 text-[#bca066]" : "bg-white/5 text-white/30",
                                            )}>
                                                {bookings.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#bca066]/30 border-t-[#bca066]" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="rounded-2xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)] py-16 text-center">
                                <p className="text-sm text-white/30">No {filter === "all" ? "" : filter} trips found.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {filtered.map((booking) => (
                                    <BookingCard key={booking._id} booking={booking} />
                                ))}
                            </div>
                        )}
                    </section>
                </section>
            </main>
        </div>
    );
}

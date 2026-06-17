import { cookies } from "next/headers";
import { fetchBookingStats, fetchBookings } from "@/lib/admin-api";
import type { BookingStats, BookingsPage } from "@/lib/admin-api";
import { TripsStats } from "@/app/components/admin/trips/trips-stats";
import { TripsList } from "@/app/components/admin/trips/trips-list";

export const metadata = {
    title: "Trip Management — Aleet Admin",
};

export default async function TripsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value ?? "";

    let stats: BookingStats = {
        totalTrips: 0,
        pending: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
        totalValue: 0,
        unassigned: 0,
    };

    let bookingsPage: BookingsPage = {
        bookings: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };

    try {
        [stats, bookingsPage] = await Promise.all([
            fetchBookingStats(token),
            fetchBookings(token, { page: 1, limit: 10, sortBy: "createdAt", order: "desc" }),
        ]);
    } catch {
        // render empty state on error — components handle it
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-text sm:text-3xl">Trip Management</h1>
                <p className="mt-1 text-sm text-muted">View and manage all platform bookings</p>
            </div>

            <TripsStats stats={stats} />

            <TripsList
                initialBookings={bookingsPage.bookings}
                initialPagination={bookingsPage.pagination}
            />
        </div>
    );
}

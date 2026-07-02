import type { Metadata } from "next";
import { AppHeader } from "@/app/components/app-header";
import { BookingShell } from "@/app/components/booking/booking-shell";

export const metadata: Metadata = {
    title: "Aleet - Book a Ride",
};

export default function BookingPage() {
    return (
        <div className="min-h-screen bg-aleet-cream text-aleet-text">
            <AppHeader />
            <BookingShell />
        </div>
    );
}

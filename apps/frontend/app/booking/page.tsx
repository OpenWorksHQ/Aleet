import type { Metadata } from "next";
import Link from "next/link";
import { SiteMenu } from "@/app/components/site-menu";
import { BookingShell } from "@/app/components/booking/booking-shell";

export const metadata: Metadata = {
    title: "Aleet - Book a Ride",
};

export default function BookingPage() {
    return (
        <div className="min-h-screen bg-[#050d0c] text-white">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 w-full border-b border-white/6 bg-[#050d0c]/90 backdrop-blur-md">
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

            <BookingShell />
        </div>
    );
}
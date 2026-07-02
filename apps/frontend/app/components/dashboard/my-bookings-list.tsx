"use client";

import { useEffect, useState } from "react";
import { fetchMyBookings, type MyBooking } from "@/lib/api/my-bookings";
import { getToken } from "@/lib/auth";
import { Loader2, MapPin, Calendar, Car, CreditCard, Tag } from "lucide-react";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const STATUS_STYLES: Record<string, string> = {
    Pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    Active: "bg-green-500/10 text-green-400 border-green-500/20",
    Completed: "bg-aleet-gold/10 text-aleet-gold border-aleet-gold/20",
    Cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PAYMENT_STYLES: Record<string, string> = {
    Unpaid: "bg-red-500/10 text-red-400 border-red-500/20",
    Paid: "bg-green-500/10 text-green-400 border-green-500/20",
};

function BookingCard({ booking }: { booking: MyBooking }) {
    const statusCls = STATUS_STYLES[booking.status] ?? "bg-aleet-cream text-aleet-text-muted border-aleet-border";
    const paymentCls = PAYMENT_STYLES[booking.paymentStatus] ?? "bg-aleet-cream text-aleet-text-muted border-aleet-border";

    return (
        <div className="rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-5">
            {/* Header row */}
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-[11px] text-aleet-text-subtle">#{booking._id.slice(-8).toUpperCase()}</p>
                    <p className="mt-0.5 text-[13px] text-aleet-text-muted">{formatDate(booking.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCls}`}>
                        {booking.status}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${paymentCls}`}>
                        {booking.paymentStatus}
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {/* Vehicle */}
                <div className="flex items-center gap-2 text-[13px]">
                    <Car className="h-3.5 w-3.5 shrink-0 text-aleet-text-subtle" />
                    <span className="text-aleet-text-muted">
                        {booking.vehicleType.name} · ${booking.vehicleType.hourlyPrice}/hr · {booking.quantity} vehicle{booking.quantity > 1 ? "s" : ""}
                    </span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 text-[13px]">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-aleet-text-subtle" />
                    <span className="text-aleet-text-muted">
                        {formatDate(booking.dates.startDate)} → {formatDate(booking.dates.endDate)}
                    </span>
                </div>

                {/* Route */}
                <div className="flex items-start gap-2 text-[13px]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aleet-text-subtle" />
                    <span className="text-aleet-text-muted">
                        {booking.pickupLocation}
                        {booking.freeRouting
                            ? " · Free routing"
                            : booking.dropoffLocation
                                ? ` → ${booking.dropoffLocation}`
                                : ""}
                    </span>
                </div>

                {/* Stops */}
                {booking.stops.length > 0 && (
                    <div className="flex items-start gap-2 text-[13px]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aleet-text-subtle" />
                        <span className="text-aleet-text-muted">
                            Stops ({booking.stops.length}): {booking.stops.map((s) => s.location).join(" → ")}
                        </span>
                    </div>
                )}

                {/* Add-ons */}
                {booking.addOns.length > 0 && (
                    <div className="flex items-start gap-2 text-[13px]">
                        <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aleet-text-subtle" />
                        <span className="text-aleet-text-muted">
                            {booking.addOns.map((a) => a.name).join(", ")}
                        </span>
                    </div>
                )}
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline justify-between border-t border-aleet-border pt-3">
                <span className="text-[12px] text-aleet-text-subtle">Total</span>
                <span className="text-[20px] font-bold text-aleet-gold">
                    ${booking.finalPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
}

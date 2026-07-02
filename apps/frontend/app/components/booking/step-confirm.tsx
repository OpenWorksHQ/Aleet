"use client";

import { CheckCircle2, MapPin, Calendar, Clock, Car, Globe, Users, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui";
import type { BookingData } from "./booking-types";
import type { BookingPriceResult } from "@/lib/api/bookings";
import type { ApiAddon } from "@/lib/api/addons";

type Props = {
    data: BookingData;
    serverPrice: BookingPriceResult | null;
    priceLoading: boolean;
    freeAddons: ApiAddon[];
    paidAddons: ApiAddon[];
    onBack: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    /** Blocks the Confirm button — e.g. same-day booking is unavailable. */
    confirmDisabled?: boolean;
};

function formatDate(d: Date | undefined) {
    if (!d) return "—";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function parseTime(t: string) {
    const m = t.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const period = m[3]?.toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { h, min };
}

function calcDurationHours(data: BookingData) {
    const { pickupDate, dropoffDate, pickupTime, dropoffTime } = data;
    if (!pickupDate || !dropoffDate || !pickupTime || !dropoffTime) return 0;
    const p = parseTime(pickupTime);
    const d = parseTime(dropoffTime);
    if (!p || !d) return 0;
    const pickupMs = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate(), p.h, p.min).getTime();
    const dropoffMs = new Date(dropoffDate.getFullYear(), dropoffDate.getMonth(), dropoffDate.getDate(), d.h, d.min).getTime();
    const diff = (dropoffMs - pickupMs) / 3600000;
    return diff > 0 ? diff : 0;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">
            {children}
        </p>
    );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 py-2.5 not-last:border-b not-last:border-aleet-border">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aleet-gold/10 text-aleet-gold">
                {icon}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span className="text-[13px] text-aleet-text-muted">{label}</span>
                <span className="shrink-0 text-right text-[13px] font-medium text-aleet-text">{value}</span>
            </div>
        </div>
    );
}

export function StepConfirm({ data, serverPrice, priceLoading, freeAddons, paidAddons, onBack, onConfirm, isLoading, confirmDisabled }: Props) {
    const hours = calcDurationHours(data);

    // Fallback client-side totals used only when server price is unavailable
    const baseRate = data.vehicleHourlyRate * data.quantity;
    const baseTotal = baseRate * hours;
    const clientGrandTotal = baseTotal;

    return (
        <div>
            <h2 className="mb-1 font-serif text-[22px] font-medium tracking-tight text-aleet-text sm:text-[26px]">
                Review & Confirm
            </h2>
            <p className="mb-6 text-[13px] text-aleet-text-muted sm:text-[15px]">
                Double-check your booking details before confirming.
            </p>

            {/* ─── Trip Details ─── */}
            <div className="rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <SectionTitle>Trip Details</SectionTitle>
                <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Pickup" value={`${formatDate(data.pickupDate)} at ${data.pickupTime || "—"}`} />
                <Row icon={<Clock className="h-3.5 w-3.5" />} label="Return" value={`${formatDate(data.dropoffDate)} at ${data.dropoffTime || "—"}`} />
                <Row icon={<Car className="h-3.5 w-3.5" />} label="Vehicle" value={data.vehicleType || "—"} />
                {data.partnerName ? (
                    <Row icon={<Globe className="h-3.5 w-3.5" />} label="Partner" value={data.partnerName} />
                ) : null}
                {data.discountPct ? (
                    <Row icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Partner discount" value={`${data.discountPct}% applied`} />
                ) : null}
                <Row icon={<Globe className="h-3.5 w-3.5" />} label="Region" value={data.region || "—"} />
                <Row icon={<Users className="h-3.5 w-3.5" />} label="Vehicles" value={`${data.quantity} × ${data.vehicleType || "vehicle"}`} />
                {hours > 0 && (
                    <Row icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={`${hours.toFixed(1)} hr${hours !== 1 ? "s" : ""}`} />
                )}
            </div>

            {/* ─── Route ─── */}
            <div className="mt-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <SectionTitle>Route</SectionTitle>

                {data.freeRouting ? (
                    <div className="flex items-start gap-3 py-2">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aleet-gold/10 text-aleet-gold">
                            <MapPin className="h-3.5 w-3.5" />
                        </span>
                        <div>
                            <p className="text-[13px] font-medium text-aleet-text">{data.pickupAddress.text || "—"}</p>
                            <p className="mt-1 text-[12px] text-aleet-gold/70">Free routing — driver follows your instructions</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative flex flex-col gap-0">
                        {/* Timeline line */}
                        <div className="absolute left-1.75 top-3 bottom-3 w-px bg-aleet-border-strong" />

                        {[
                            { text: data.pickupAddress.text, note: "" },
                            ...data.stops.map((s) => ({ text: s.address.text, note: s.notes })),
                            { text: data.dropoffAddress.text, note: "" },
                        ].filter((a) => a.text).map((item, i, arr) => (
                            <div key={i} className="flex items-start gap-3 py-2">
                                <span className="relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-aleet-border-strong bg-aleet-card">
                                    {i === 0 ? (
                                        <span className="h-2 w-2 rounded-full bg-aleet-gold" />
                                    ) : i === arr.length - 1 ? (
                                        <span className="h-2 w-2 rounded-full bg-aleet-text-subtle" />
                                    ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-aleet-border-strong" />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <p className={`text-[13px] ${i === 0 ? "font-medium text-aleet-text" : i === arr.length - 1 ? "font-medium text-aleet-text" : "text-aleet-text-muted"}`}>
                                        {item.text}
                                    </p>
                                    {item.note.trim() && (
                                        <p className="mt-0.5 text-[12px] italic text-aleet-gold/70">{item.note}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Add-ons ─── */}
            {data.selectedAddons.length > 0 && (
                <div className="mt-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                    <SectionTitle>Add-ons</SectionTitle>
                    <div className="flex flex-col gap-2">
                        {data.selectedAddons.map((id) => {
                            const paid = paidAddons.find((a) => a._id === id);
                            const free = freeAddons.find((a) => a._id === id);
                            const addon = paid ?? free;
                            return (
                                <div key={id} className="flex items-center justify-between py-1.5 not-last:border-b not-last:border-aleet-border">
                                    <span className="text-[13px] text-aleet-text">{addon?.name ?? id}</span>
                                    <span className="text-[13px] text-aleet-text-subtle">
                                        {paid ? `+$${paid.price}/hr` : <span className="text-[#4caf50]">Free</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Price Breakdown ─── */}
            <div className="mt-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <SectionTitle>Order Total</SectionTitle>

                {priceLoading ? (
                    <div className="flex items-center justify-center gap-2.5 py-6 text-aleet-text-subtle">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-[13px]">Calculating price…</span>
                    </div>
                ) : serverPrice ? (
                    <div className="space-y-2.5">
                        {/* Base */}
                        <div className="flex justify-between text-[13px]">
                            <span className="text-aleet-text-muted">
                                {serverPrice.vehicleType.name} × {serverPrice.quantity} · ${serverPrice.breakdown.baseRate}/hr · {serverPrice.hours}h
                            </span>
                            <span className="text-aleet-text">${(serverPrice.breakdown.baseRate * serverPrice.quantity * serverPrice.hours).toFixed(0)}</span>
                        </div>
                        {/* Add-ons */}
                        {(serverPrice.breakdown.addOns ?? []).map((addon) => (
                            <div key={addon._id} className="flex justify-between text-[13px]">
                                <span className="text-aleet-text-muted">{addon.name}</span>
                                <span className="text-aleet-text">+${addon.price}</span>
                            </div>
                        ))}
                        {/* Distance surcharge */}
                        {serverPrice.breakdown.distance.distanceSurcharge > 0 && (
                            <div className="flex justify-between text-[13px]">
                                <span className="text-aleet-text-muted">Distance surcharge</span>
                                <span className="text-aleet-text">+${serverPrice.breakdown.distance.distanceSurcharge.toFixed(0)}</span>
                            </div>
                        )}
                        {/* Free hours used */}
                        {serverPrice.breakdown.freeHoursUsed > 0 && (
                            <div className="flex justify-between text-[13px]">
                                <span className="text-aleet-text-muted">Free hours applied</span>
                                <span className="text-[#4caf50]">−{serverPrice.breakdown.freeHoursUsed}h</span>
                            </div>
                        )}
                        <div className="mt-3 flex justify-between border-t border-aleet-border pt-3">
                            <span className="text-[15px] font-semibold text-aleet-text">Total</span>
                            <span className="text-[18px] font-bold text-aleet-gold">${serverPrice.total.toFixed(0)}</span>
                        </div>
                    </div>
                ) : hours > 0 && data.vehicleHourlyRate > 0 ? (
                    <div className="space-y-2.5">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-aleet-text-muted">
                                {data.vehicleType} × {data.quantity} · ${data.vehicleHourlyRate}/hr · {hours.toFixed(1)}h
                            </span>
                            <span className="text-aleet-text">${baseTotal.toFixed(0)}</span>
                        </div>
                        <div className="mt-3 flex justify-between border-t border-aleet-border pt-3">
                            <span className="text-[15px] font-semibold text-aleet-text">Estimated Total</span>
                            <span className="text-[18px] font-bold text-aleet-gold">${clientGrandTotal.toFixed(0)}</span>
                        </div>
                    </div>
                ) : (
                    <p className="py-4 text-center text-[13px] text-aleet-text-subtle">
                        Price unavailable — please check your booking details.
                    </p>
                )}
            </div>

            {/* ─── Special Requests ─── */}
            {data.specialRequests && (
                <div className="mt-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                    <SectionTitle>Special Requests</SectionTitle>
                    <p className="text-[13px] leading-relaxed text-aleet-text-muted">{data.specialRequests}</p>
                </div>
            )}

            <p className="mt-4 text-left text-[11px] text-aleet-text-subtle">
                By confirming, you agree to our Terms of Service and Cancellation Policy.
            </p>

            {/* ─── Actions ─── */}
            <div className="mt-6 flex gap-3">
                <Button variant="ghost" className="w-full sm:w-auto sm:min-w-36 bg-transparent border-0 text-sm!" onClick={onBack}>
                    ← Back
                </Button>
                <Button
                    className="flex-1"
                    onClick={onConfirm}
                    isLoading={isLoading}
                    disabled={confirmDisabled}
                >
                    {!isLoading && <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Confirm Booking
                </Button>
            </div>
        </div>
    );
}

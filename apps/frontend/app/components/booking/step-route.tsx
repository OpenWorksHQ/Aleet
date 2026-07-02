"use client";

import { Plus, Trash2, Navigation, Check } from "lucide-react";
import { useState } from "react";
import { Button, Toggle, AddressAutocomplete, TimePicker, toast } from "@/app/components/ui";
import type { BookingData } from "./booking-types";
import type { ApiAddon } from "@/lib/api/addons";

type Props = {
    data: BookingData;
    quickBookingMode: "buy_hours" | "multi_day" | null;
    onChange: (patch: Partial<BookingData>) => void;
    onNext: () => void;
    onBack?: () => void;
    priceBar?: React.ReactNode;
    freeAddons: ApiAddon[];
    paidAddons: ApiAddon[];
    addonsLoading: boolean;
};

function nanoid() {
    return Math.random().toString(36).slice(2, 500);
}

export function StepRoute({ data, quickBookingMode, onChange, onNext, onBack, priceBar, freeAddons, paidAddons, addonsLoading }: Props) {
    const [isLocating, setIsLocating] = useState(false);

    function addStop() {
        onChange({ stops: [...data.stops, { id: nanoid(), address: { text: "", placeId: "" }, time: "", notes: "" }] });
    }

    function updateStop(id: string, place: { text: string; placeId: string }) {
        onChange({ stops: data.stops.map((s) => (s.id === id ? { ...s, address: place } : s)) });
    }

    function updateStopTime(id: string, time: string) {
        onChange({ stops: data.stops.map((s) => (s.id === id ? { ...s, time } : s)) });
    }

    function updateStopNotes(id: string, notes: string) {
        onChange({ stops: data.stops.map((s) => (s.id === id ? { ...s, notes } : s)) });
    }

    function removeStop(id: string) {
        onChange({ stops: data.stops.filter((s) => s.id !== id) });
    }

    function toggleAddon(id: string) {
        const current = data.selectedAddons;
        onChange({
            selectedAddons: current.includes(id)
                ? current.filter((a) => a !== id)
                : [...current, id],
        });
    }

    function handleUseCurrentLocation() {
        if (isLocating) return;
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            toast.error("Geolocation is not supported by this browser.");
            return;
        }

        setIsLocating(true);

        const applyCoords = (latitude: number, longitude: number) => {
            const fallbackText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            onChange({
                pickupAddress: {
                    text: fallbackText,
                    placeId: "",
                },
            });

            if (typeof google === "undefined" || !google.maps?.Geocoder) {
                toast.warning("Using coordinates as pickup location.");
                setIsLocating(false);
                return;
            }

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                if (status === "OK" && results && results[0]) {
                    onChange({
                        pickupAddress: {
                            text: results[0].formatted_address,
                            placeId: results[0].place_id ?? "",
                        },
                    });
                    toast.success("Current location applied.");
                } else {
                    toast.warning("Address lookup failed. Coordinates were used instead.");
                }
                setIsLocating(false);
            });
        };

        const handleGeoError = (error: GeolocationPositionError) => {
            // Safari/iOS can transiently throw POSITION_UNAVAILABLE (kCLErrorLocationUnknown).
            // Retry once with relaxed options to recover without user action.
            if (error.code === error.POSITION_UNAVAILABLE) {
                navigator.geolocation.getCurrentPosition(
                    (retryPosition) => {
                        applyCoords(retryPosition.coords.latitude, retryPosition.coords.longitude);
                    },
                    (retryError) => {
                        setIsLocating(false);
                        if (retryError.code === retryError.PERMISSION_DENIED) {
                            toast.error("Location access was denied. Please enter pickup address manually.");
                            return;
                        }
                        if (retryError.code === retryError.TIMEOUT) {
                            toast.error("Location request timed out. Please try again.");
                            return;
                        }
                        toast.error("Location unavailable right now. Please try again in a moment.");
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
                );
                return;
            }

            setIsLocating(false);
            if (error.code === error.PERMISSION_DENIED) {
                toast.error("Location access was denied. Please enter pickup address manually.");
                return;
            }
            if (error.code === error.TIMEOUT) {
                toast.error("Location request timed out. Please try again.");
                return;
            }
            toast.error("Could not determine current location.");
        };

        navigator.geolocation.getCurrentPosition(
            (position) => applyCoords(position.coords.latitude, position.coords.longitude),
            handleGeoError,
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
        );
    }

    const addonTotal = data.selectedAddons.reduce((sum, id) => {
        const addon = paidAddons.find((a) => a._id === id);
        return sum + (addon?.price ?? 0);
    }, 0);

    const isBuyHours = quickBookingMode === "buy_hours";
    const fromHomepage = quickBookingMode !== null;
    const isValid = isBuyHours
        ? !!data.pickupAddress.text && !!data.dropoffAddress.text
        : !!data.pickupAddress.text && (data.freeRouting || !!data.dropoffAddress.text);

    return (
        <div>
            <h2 className="mb-1 text-[22px] font-semibold tracking-tight text-white sm:text-[26px]">
                Route & Add-ons
            </h2>
            <p className="mb-6 text-[13px] text-white/50 sm:text-[15px]">
                Set your drop-off location, stops, and any extras for the trip.
            </p>

            {/* ─── Fleet Size ─── */}
            <div className="my-3 rounded-2xl border border-[#1e2a2c] bg-[#0c1211] p-4 sm:p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Fleet Size</p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onChange({ quantity: Math.max(1, data.quantity - 1) })}
                        disabled={data.quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2e3638] bg-[#1e2527] text-white/60 transition-colors hover:border-[#bca066]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <span className="text-lg font-light leading-none">−</span>
                    </button>
                    <div className="flex min-w-16 flex-col items-center">
                        <span className="text-[22px] font-semibold leading-none text-white tabular-nums">{data.quantity}</span>
                        <span className="mt-0.5 text-[10px] text-[#5a7060]">vehicle{data.quantity > 1 ? "s" : ""}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange({ quantity: Math.min(5, data.quantity + 1) })}
                        disabled={data.quantity >= 5}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2e3638] bg-[#1e2527] text-white/60 transition-colors hover:border-[#bca066]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <span className="text-lg font-light leading-none">+</span>
                    </button>
                </div>
            </div>

            {/* ─── Locations ─── */}
            <div className="rounded-2xl border border-[#1e2a2c] bg-[#0c1211] p-4 sm:p-6">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Locations</p>

                {!isBuyHours && (
                    <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-[#1e2a2c] bg-[#111918]/60 p-3.5">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#bca066]/10 text-[#bca066]">
                                <Navigation className="h-3.5 w-3.5" />
                            </span>
                            <div>
                                <p className="text-[13px] font-semibold text-white">Free Routing</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-white/45 sm:text-[12px]">
                                    Skip setting a fixed drop-off — direct your driver in real time.
                                </p>
                            </div>
                        </div>
                        <Toggle
                            checked={data.freeRouting}
                            onChange={(v) => onChange({ freeRouting: v, stops: [] })}
                            ariaLabel="Toggle free routing"
                            className="mt-0.5 shrink-0"
                        />
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {/* Pickup address — editable */}
                    <AddressAutocomplete
                        label="Pickup Address"
                        value={data.pickupAddress.text}
                        onChange={(v) => onChange({ pickupAddress: { ...data.pickupAddress, text: v } })}
                        onPlaceChange={(place) => onChange({ pickupAddress: place })}
                        placeholder="123 Main St, New York, NY"
                    />
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        className="w-fit rounded-lg border border-[#2e3638] bg-[#1e2527] px-3 py-2 text-[12px] font-medium text-white/75 transition-colors hover:border-[#bca066]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isLocating ? "Detecting..." : "Use Current Location"}
                    </button>

                    {/* Stops */}
                    {!data.freeRouting && data.stops.map((stop, i) => (
                        <div key={stop.id} className="flex flex-col gap-2">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <AddressAutocomplete
                                        label={`Stop ${i + 1}`}
                                        value={stop.address.text}
                                        onChange={(v) => updateStop(stop.id, { ...stop.address, text: v })}
                                        onPlaceChange={(place) => updateStop(stop.id, place)}
                                        placeholder="Enter stop address"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeStop(stop.id)}
                                    className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#2e3638] bg-[#1e2527] text-[#5a6870] transition-colors hover:border-red-500/30 hover:bg-red-950/30 hover:text-red-400 sm:h-12 sm:w-12"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <TimePicker
                                label={`Stop ${i + 1} Arrival Time`}
                                value={stop.time}
                                onChange={(t) => updateStopTime(stop.id, t)}
                                placeholder="Select arrival time"
                            />
                            <textarea
                                rows={2}
                                value={stop.notes}
                                onChange={(e) => updateStopNotes(stop.id, e.target.value)}
                                placeholder={`Notes for stop ${i + 1} (optional) — gate code, contact, instructions…`}
                                className="w-full resize-none rounded-lg border border-[#2e3638] bg-[#1e2527] px-3 py-2.5 text-[13px] text-white placeholder:text-[#5a6870] outline-none transition-colors focus:border-[#bca066]/40 focus:bg-[#1e2a1a] sm:text-[14px]"
                            />
                        </div>
                    ))}

                    <AddressAutocomplete
                        label="Drop-off Address"
                        value={data.dropoffAddress.text}
                        onChange={(v) => onChange({ dropoffAddress: { ...data.dropoffAddress, text: v } })}
                        onPlaceChange={(place) => onChange({ dropoffAddress: place })}
                        placeholder="456 Park Ave, New York, NY"
                    />
                </div>

                {/* Add stop button */}
                {!data.freeRouting && (
                    <button
                        type="button"
                        onClick={addStop}
                        className="mt-3 flex items-center gap-2 text-[12px] font-medium text-[#bca066]/70 transition-colors hover:text-[#bca066]"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Stop
                    </button>
                )}
            </div>

            {/* ─── Add-ons ─── */}
            <div className="mt-3 rounded-2xl border border-[#1e2a2c] bg-[#0c1211] p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Optional Add-ons</p>
                    {addonTotal > 0 && (
                        <span className="text-[12px] text-[#bca066]">+${addonTotal}/hr</span>
                    )}
                </div>

                {addonsLoading ? (
                    <p className="py-4 text-center text-[13px] text-white/30">Loading add-ons…</p>
                ) : (freeAddons.length === 0 && paidAddons.length === 0) ? (
                    <p className="py-4 text-center text-[13px] text-white/30">No add-ons available.</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Paid add-ons */}
                        {paidAddons.length > 0 && (
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Paid</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {paidAddons.map((addon) => {
                                        const selected = data.selectedAddons.includes(addon._id);
                                        return (
                                            <button
                                                key={addon._id}
                                                type="button"
                                                onClick={() => toggleAddon(addon._id)}
                                                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 ${selected
                                                    ? "border-[#bca066]/40 bg-[#1a1800]/80 shadow-[0_0_0_1px_rgba(188,160,102,0.15)]"
                                                    : "border-[#1e2a2c] bg-[#111918]/50 hover:border-[#2a3336]"
                                                    }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-[13px] font-semibold ${selected ? "text-[#bca066]" : "text-white"}`}>
                                                            {addon.name}
                                                        </p>
                                                        <span className={`text-[11px] ${selected ? "text-[#bca066]/70" : "text-[#5a7060]"}`}>
                                                            +${addon.price}/hr
                                                        </span>
                                                    </div>
                                                    {addon.description && (
                                                        <p className="mt-0.5 text-[11px] leading-snug text-white/40">
                                                            {addon.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${selected ? "bg-[#bca066] opacity-100" : "opacity-0"}`}>
                                                    <Check className="h-3 w-3 text-[#0a0a00]" strokeWidth={3} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Free add-ons */}
                        {freeAddons.length > 0 && (
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Complimentary</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {freeAddons.map((addon) => {
                                        const selected = data.selectedAddons.includes(addon._id);
                                        return (
                                            <button
                                                key={addon._id}
                                                type="button"
                                                onClick={() => toggleAddon(addon._id)}
                                                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 ${selected
                                                    ? "border-[#bca066]/40 bg-[#1a1800]/80 shadow-[0_0_0_1px_rgba(188,160,102,0.15)]"
                                                    : "border-[#1e2a2c] bg-[#111918]/50 hover:border-[#2a3336]"
                                                    }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-[13px] font-semibold ${selected ? "text-[#bca066]" : "text-white"}`}>
                                                            {addon.name}
                                                        </p>
                                                        <span className={`text-[11px] ${selected ? "text-[#4caf50]/80" : "text-[#3a7060]"}`}>
                                                            Free
                                                        </span>
                                                    </div>
                                                    {addon.description && (
                                                        <p className="mt-0.5 text-[11px] leading-snug text-white/40">
                                                            {addon.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${selected ? "bg-[#bca066] opacity-100" : "opacity-0"}`}>
                                                    <Check className="h-3 w-3 text-[#0a0a00]" strokeWidth={3} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Special Requests ─── */}
            <div className="mt-3 rounded-2xl border border-[#1e2a2c] bg-[#0c1211] p-4 sm:p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Special Requests</p>
                <textarea
                    rows={3}
                    value={data.specialRequests}
                    onChange={(e) => onChange({ specialRequests: e.target.value })}
                    placeholder="Any special instructions for your driver..."
                    className="w-full resize-none rounded-lg border border-[#2e3638] bg-[#1e2527] px-3 py-2.5 text-[13px] text-white placeholder:text-[#5a6870] outline-none transition-colors focus:border-[#bca066]/40 focus:bg-[#1e2a1a] sm:text-[14px]"
                />
            </div>

            <div className="mt-6">
                {priceBar}
                <div className="flex gap-3">
                    {onBack && (
                        <Button variant="ghost" className="w-full sm:w-auto sm:min-w-36 bg-transparent border-0 text-sm!" onClick={onBack}>
                            ← Back
                        </Button>
                    )}
                    <Button className="flex-1" disabled={!isValid} onClick={onNext}>
                        {fromHomepage ? "Complete Booking" : "Review Booking →"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

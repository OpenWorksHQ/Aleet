"use client";

import { Plus, Trash2, Navigation, Check } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Toggle, AddressAutocomplete, TimePicker, toast } from "@/app/components/ui";
import type { BookingData } from "./booking-types";
import type { ApiAddon } from "@/lib/api/addons";
import type { BookingPriceResult } from "@/lib/api/bookings";
import { VenueAccessSummary } from "@/app/components/partner/venue-access-summary";
import { estimateRoute } from "@/lib/partner/route-estimate";
import { applyRouteEstimateToBooking } from "@/lib/partner/venue-access";

type Props = {
    data: BookingData;
    quickBookingMode: "buy_hours" | "multi_day" | "venue_access" | null;
    serverPrice?: BookingPriceResult | null;
    priceLoading?: boolean;
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

export function StepRoute({ data, quickBookingMode, serverPrice, priceLoading, onChange, onNext, onBack, priceBar, freeAddons, paidAddons, addonsLoading }: Props) {
    const [isLocating, setIsLocating] = useState(false);
    const [isEstimatingRoute, setIsEstimatingRoute] = useState(false);
    const routeRequestRef = useRef(0);

    const isVenueAccess = data.bookingMode === "venue_access" || quickBookingMode === "venue_access";
    const pickupLocked = isVenueAccess && data.pickupLocked !== false;

    async function recalculateRoute(dropoff: { text: string; placeId: string }) {
        if (!isVenueAccess || !data.pickupAddress.text || !dropoff.text) return;

        const requestId = ++routeRequestRef.current;
        setIsEstimatingRoute(true);

        try {
            const estimate = await estimateRoute(data.pickupAddress, dropoff);
            if (!estimate || requestId !== routeRequestRef.current) return;

            onChange({
                ...applyRouteEstimateToBooking(data, estimate.durationHours),
                routeDistanceMiles: estimate.distanceMiles,
                routeDurationText: estimate.durationText,
            });
        } catch {
            toast.error("Could not estimate route. Please try again.");
        } finally {
            if (requestId === routeRequestRef.current) {
                setIsEstimatingRoute(false);
            }
        }
    }

    function handleDropoffPlaceChange(place: { text: string; placeId: string }) {
        onChange({ dropoffAddress: place });
        void recalculateRoute(place);
    }

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
    const isValid = isVenueAccess
        ? !!data.pickupAddress.text && !!data.dropoffAddress.text && !!data.estimatedDurationHours
        : isBuyHours
            ? !!data.pickupAddress.text && !!data.dropoffAddress.text
            : !!data.pickupAddress.text && (data.freeRouting || !!data.dropoffAddress.text);

    return (
        <div>
            <h2 className="mb-1 font-serif text-[22px] font-medium tracking-tight text-aleet-text sm:text-[26px]">
                {isVenueAccess ? "Venue Access Booking" : "Route & Add-ons"}
            </h2>
            <p className="mb-6 text-[13px] text-aleet-text-muted sm:text-[15px]">
                {isVenueAccess
                    ? "Your partner venue is already attached. Enter your destination and we’ll calculate the rest."
                    : "Set your drop-off location, stops, and any extras for the trip."}
            </p>

            {isVenueAccess ? (
                <VenueAccessSummary
                    data={data}
                    serverPrice={serverPrice ?? null}
                    priceLoading={priceLoading || isEstimatingRoute}
                    className="mb-5"
                />
            ) : null}

            {/* ─── Fleet Size ─── */}
            {!isVenueAccess ? (
            <div className="my-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Fleet Size</p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onChange({ quantity: Math.max(1, data.quantity - 1) })}
                        disabled={data.quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-aleet-border-strong bg-aleet-cream text-aleet-text-muted transition-colors hover:border-aleet-gold/30 hover:text-aleet-text disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <span className="text-lg font-light leading-none">−</span>
                    </button>
                    <div className="flex min-w-16 flex-col items-center">
                        <span className="text-[22px] font-semibold leading-none text-aleet-text tabular-nums">{data.quantity}</span>
                        <span className="mt-0.5 text-[10px] text-aleet-text-subtle">vehicle{data.quantity > 1 ? "s" : ""}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange({ quantity: Math.min(5, data.quantity + 1) })}
                        disabled={data.quantity >= 5}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-aleet-border-strong bg-aleet-cream text-aleet-text-muted transition-colors hover:border-aleet-gold/30 hover:text-aleet-text disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <span className="text-lg font-light leading-none">+</span>
                    </button>
                </div>
            </div>
            ) : null}

            {/* ─── Locations ─── */}
            <div className="rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Locations</p>

                {!isBuyHours && !isVenueAccess && (
                    <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-aleet-border bg-aleet-cream p-3.5">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-aleet-gold/10 text-aleet-gold">
                                <Navigation className="h-3.5 w-3.5" />
                            </span>
                            <div>
                                <p className="text-[13px] font-semibold text-aleet-text">Free Routing</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-aleet-text-muted sm:text-[12px]">
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
                        label={isVenueAccess ? "Partner Venue (Pickup)" : "Pickup Address"}
                        value={data.pickupAddress.text}
                        onChange={(v) => onChange({ pickupAddress: { ...data.pickupAddress, text: v } })}
                        onPlaceChange={(place) => onChange({ pickupAddress: place })}
                        placeholder="123 Main St, New York, NY"
                        disabled={pickupLocked}
                    />
                    {!pickupLocked && !isVenueAccess ? (
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        className="w-fit rounded-lg border border-aleet-border-strong bg-aleet-cream px-3 py-2 text-[12px] font-medium text-aleet-text-muted transition-colors hover:border-aleet-gold/30 hover:text-aleet-text disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isLocating ? "Detecting..." : "Use Current Location"}
                    </button>
                    ) : null}

                    {/* Stops */}
                    {!data.freeRouting && !isVenueAccess && data.stops.map((stop, i) => (
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
                                    className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-aleet-border-strong bg-aleet-cream text-aleet-text-subtle transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 sm:h-12 sm:w-12"
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
                                className="w-full resize-none rounded-lg border border-aleet-border-strong bg-aleet-cream px-3 py-2.5 text-[13px] text-aleet-text placeholder:text-aleet-text-subtle outline-none transition-colors focus:border-aleet-gold/40 focus:bg-aleet-gold/5 sm:text-[14px]"
                            />
                        </div>
                    ))}

                    <AddressAutocomplete
                        label={isVenueAccess ? "Where are you going?" : "Drop-off Address"}
                        value={data.dropoffAddress.text}
                        onChange={(v) => onChange({ dropoffAddress: { ...data.dropoffAddress, text: v } })}
                        onPlaceChange={isVenueAccess ? handleDropoffPlaceChange : (place) => onChange({ dropoffAddress: place })}
                        placeholder={isVenueAccess ? "Enter your destination" : "456 Park Ave, New York, NY"}
                    />
                    {isVenueAccess && isEstimatingRoute ? (
                        <p className="text-[12px] text-aleet-text-subtle">Calculating route and price…</p>
                    ) : null}
                </div>

                {/* Add stop button */}
                {!data.freeRouting && !isVenueAccess && (
                    <button
                        type="button"
                        onClick={addStop}
                        className="mt-3 flex items-center gap-2 text-[12px] font-medium text-aleet-gold/70 transition-colors hover:text-aleet-gold"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Stop
                    </button>
                )}
            </div>

            {/* ─── Add-ons ─── */}
            <div className="mt-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Optional Add-ons</p>
                    {addonTotal > 0 && (
                        <span className="text-[12px] text-aleet-gold">+${addonTotal}/hr</span>
                    )}
                </div>

                {addonsLoading ? (
                    <p className="py-4 text-center text-[13px] text-aleet-text-subtle">Loading add-ons…</p>
                ) : (freeAddons.length === 0 && paidAddons.length === 0) ? (
                    <p className="py-4 text-center text-[13px] text-aleet-text-subtle">No add-ons available.</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Paid add-ons */}
                        {paidAddons.length > 0 && (
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Paid</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {paidAddons.map((addon) => {
                                        const selected = data.selectedAddons.includes(addon._id);
                                        return (
                                            <button
                                                key={addon._id}
                                                type="button"
                                                onClick={() => toggleAddon(addon._id)}
                                                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 ${selected
                                                    ? "border-aleet-gold/40 bg-aleet-gold/10 shadow-sm"
                                                    : "border-aleet-border bg-aleet-cream hover:border-aleet-border"
                                                    }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-[13px] font-semibold ${selected ? "text-aleet-gold" : "text-aleet-text"}`}>
                                                            {addon.name}
                                                        </p>
                                                        <span className={`text-[11px] ${selected ? "text-aleet-gold/70" : "text-aleet-text-subtle"}`}>
                                                            +${addon.price}/hr
                                                        </span>
                                                    </div>
                                                    {addon.description && (
                                                        <p className="mt-0.5 text-[11px] leading-snug text-aleet-text-muted">
                                                            {addon.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${selected ? "bg-aleet-gold opacity-100" : "opacity-0"}`}>
                                                    <Check className="h-3 w-3 text-aleet-text" strokeWidth={3} />
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
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Complimentary</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {freeAddons.map((addon) => {
                                        const selected = data.selectedAddons.includes(addon._id);
                                        return (
                                            <button
                                                key={addon._id}
                                                type="button"
                                                onClick={() => toggleAddon(addon._id)}
                                                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 ${selected
                                                    ? "border-aleet-gold/40 bg-aleet-gold/10 shadow-sm"
                                                    : "border-aleet-border bg-aleet-cream hover:border-aleet-border"
                                                    }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-[13px] font-semibold ${selected ? "text-aleet-gold" : "text-aleet-text"}`}>
                                                            {addon.name}
                                                        </p>
                                                        <span className={`text-[11px] ${selected ? "text-[#4caf50]/80" : "text-[#3a7060]"}`}>
                                                            Free
                                                        </span>
                                                    </div>
                                                    {addon.description && (
                                                        <p className="mt-0.5 text-[11px] leading-snug text-aleet-text-muted">
                                                            {addon.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${selected ? "bg-aleet-gold opacity-100" : "opacity-0"}`}>
                                                    <Check className="h-3 w-3 text-aleet-text" strokeWidth={3} />
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
            <div className="mt-3 rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Special Requests</p>
                <textarea
                    rows={3}
                    value={data.specialRequests}
                    onChange={(e) => onChange({ specialRequests: e.target.value })}
                    placeholder="Any special instructions for your driver..."
                    className="w-full resize-none rounded-lg border border-aleet-border-strong bg-aleet-cream px-3 py-2.5 text-[13px] text-aleet-text placeholder:text-aleet-text-subtle outline-none transition-colors focus:border-aleet-gold/40 focus:bg-aleet-gold/5 sm:text-[14px]"
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
                    <Button className="flex-1" disabled={!isValid || isEstimatingRoute} onClick={onNext}>
                        {isVenueAccess ? "Review & Complete →" : fromHomepage ? "Complete Booking" : "Review Booking →"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

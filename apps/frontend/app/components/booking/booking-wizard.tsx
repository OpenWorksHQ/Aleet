"use client";

import { Fragment, useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { EMPTY_BOOKING, type BookingData } from "./booking-types";
import { StepTrip } from "./step-trip";
import { StepRoute } from "./step-route";
import { StepConfirm } from "./step-confirm";
import { TripSummaryBar } from "./trip-summary-bar";
import { buildTripWindow, calculateBookingPrice, startBooking, type BookingPriceResult } from "@/lib/api/bookings";
import { BookingPaymentStep } from "@/app/components/payments/booking-payment-step";
import { fetchAddons, type ApiAddon } from "@/lib/api/addons";
import { getVehicleTypes } from "@/lib/api/vehicle-types";
import { getRegions } from "@/lib/api/regions";
import { PriceBar } from "./price-bar";
import { getToken } from "@/lib/auth";
import { getProfile } from "@/lib/api/users";
import { ApiError } from "@/lib/api";
import { toast } from "@/app/components/ui";
import { loadPendingBooking, clearPendingBooking } from "@/lib/pending-booking";
import { loadPartnerContext } from "@/lib/partner/attribution";
import { useSameDayAvailability } from "@/lib/use-same-day-availability";
import { SameDayNotice } from "./same-day-notice";
import { PartnerContextBanner } from "@/app/components/partner/partner-context-banner";

type Step = 1 | 2 | 3 | 4;

const STEPS: { label: string; sub: string }[] = [
    { label: "Trip", sub: "Dates & vehicle" },
    { label: "Route", sub: "Locations & extras" },
    { label: "Confirm", sub: "Review & book" },
];
// ── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, skipFirstStep }: { current: Step; skipFirstStep?: boolean }) {
    const visibleSteps = skipFirstStep ? STEPS.slice(1) : STEPS;
    const stepOffset = skipFirstStep ? 1 : 0;

    return (
        <div className="flex w-full items-center">
            {visibleSteps.map((step, i) => {
                const idx = (i + 1 + stepOffset) as Step;
                const displayNum = i + 1;
                const isDone = current > idx;
                const isActive = current === idx;
                return (
                    <Fragment key={step.label}>
                        {/* Left connector (before this node) */}
                        {i > 0 && (
                            <div className="relative mb-6 h-0.5 flex-1 overflow-hidden rounded-full bg-aleet-border-strong">
                                <div
                                    className="absolute inset-0 origin-left rounded-full bg-aleet-gold/50 transition-transform duration-500 ease-in-out"
                                    style={{ transform: current > idx - 1 ? "scaleX(1)" : "scaleX(0)" }}
                                />
                            </div>
                        )}
                        {/* Node */}
                        <div className="flex shrink-0 flex-col items-center gap-1.5">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold transition-all duration-300 ${isDone
                                    ? "border-aleet-gold/30 bg-aleet-gold/15 text-aleet-gold"
                                    : isActive
                                        ? "border-aleet-gold bg-aleet-gold text-aleet-text shadow-sm"
                                        : "border-aleet-border bg-aleet-card text-aleet-text-subtle"
                                    }`}
                            >
                                {isDone ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                                        <path d="m5 13 4 4L19 7" />
                                    </svg>
                                ) : (
                                    displayNum
                                )}
                            </div>
                            <div className="text-center">
                                <p className={`text-[12px] font-semibold ${isActive ? "text-aleet-text" : isDone ? "text-aleet-gold/70" : "text-aleet-text-subtle"}`}>
                                    {step.label}
                                </p>
                                <p className="hidden text-[10px] text-aleet-text-subtle sm:block">{step.sub}</p>
                            </div>
                        </div>
                        {/* Right connector (after last node — not needed) */}
                    </Fragment>
                );
            })}
        </div>
    );
}

export function BookingStepIndicator({ step, skipFirstStep }: { step: Step; skipFirstStep?: boolean }) {
    return <StepIndicator current={step} skipFirstStep={skipFirstStep} />;
}

function initWizard(): { step: Step; fromQuickBooking: boolean; quickBookingMode: "buy_hours" | "multi_day" | "venue_access" | null; data: BookingData } {
    // Always start at step 1 on SSR — client-side effect will adjust
    return { step: 1, fromQuickBooking: false, quickBookingMode: null, data: EMPTY_BOOKING };
}

export function BookingWizard({ onStepChange, renderIndicator }: { onStepChange?: (s: number) => void; renderIndicator?: (step: Step, skipFirstStep: boolean) => React.ReactNode }) {
    const [{ step, fromQuickBooking, quickBookingMode, data }, setWizardState] = useState(initWizard);

    const setStep = (s: Step) => {
        setWizardState((prev) => ({ ...prev, step: s }));
        onStepChange?.(s);
    };
    const setData = (updater: (prev: BookingData) => BookingData) =>
        setWizardState((prev) => ({ ...prev, data: updater(prev.data) }));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
    const [paymentComplete, setPaymentComplete] = useState(false);
    const [serverPrice, setServerPrice] = useState<BookingPriceResult | null>(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [freeAddons, setFreeAddons] = useState<ApiAddon[]>([]);
    const [paidAddons, setPaidAddons] = useState<ApiAddon[]>([]);
    const [addonsLoading, setAddonsLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Live same-day availability for the chosen region + pickup. Drives the
    // styled SameDayNotice and gates Continue / Confirm before submission.
    const sameDay = useSameDayAvailability(
        data.regionId,
        data.pickupDate,
        data.pickupTime,
        buildTripWindow(data),
    );

    // Detect membership — members are exempt from the 3-hour minimum
    useEffect(() => {
        const token = getToken();
        if (!token) return;
        getProfile(token)
            .then((res) => {
                if (res.data) setIsMember(res.data.subscriptionStatus === "subscriber");
            })
            .catch(() => { /* treat as non-member */ });
    }, []);

    // On mount (client only): load pending booking from localStorage and jump to step 2
    useLayoutEffect(() => {
        const pending = loadPendingBooking();
        const partner = loadPartnerContext();

        if (!pending) {
            if (partner?.bookingMode === "venue_access") {
                const loaded: BookingData = {
                    ...EMPTY_BOOKING,
                    bookingMode: "venue_access",
                    partnerId: partner.partnerId,
                    partnerCode: partner.partnerCode,
                    partnerName: partner.partnerName,
                    venueId: partner.venueId,
                    pickupLocked: partner.pickupLocked,
                    dropoffLocked: partner.dropoffLocked,
                    venueAccessBookingType: partner.venueAccessBookingType,
                    allowedVehicleTypeIds: partner.allowedVehicleTypeIds,
                    discountPct: partner.discountPct,
                    pickupAddress: partner.pickupLocation ?? EMPTY_BOOKING.pickupAddress,
                    dropoffAddress: partner.dropoffLocation ?? EMPTY_BOOKING.dropoffAddress,
                    region: partner.regionName ?? "",
                    regionId: partner.regionId ?? "",
                    vehicleType: partner.vehicleName ?? "",
                    vehicleTypeId: partner.vehicleTypeId ?? "",
                    vehicleHourlyRate: partner.vehicleHourlyRate ?? 0,
                    freeRouting: false,
                };
                setWizardState({
                    step: 1,
                    fromQuickBooking: false,
                    quickBookingMode: "venue_access",
                    data: loaded,
                });
                onStepChange?.(1);
            } else {
                onStepChange?.(1);
            }
            return;
        }

        const isVenueAccess = pending.bookingMode === "venue_access";
        const normalizedMode: "buy_hours" | "multi_day" | "venue_access" = isVenueAccess
            ? "venue_access"
            : pending.bookingMode === "buy_hours" || pending.bookingMode === "buy-hours"
                ? "buy_hours"
                : "multi_day";

        const loaded: BookingData = {
            ...EMPTY_BOOKING,
            pickupDate: pending.pickupDate ? new Date(pending.pickupDate) : undefined,
            dropoffDate: pending.dropoffDate ? new Date(pending.dropoffDate) : undefined,
            pickupTime: pending.pickupTime,
            dropoffTime: pending.dropoffTime,
            vehicleType: pending.vehicleType,
            vehicleTypeId: pending.vehicleTypeId,
            vehicleHourlyRate: pending.vehicleHourlyRate,
            region: pending.region,
            regionId: pending.regionId,
            bookingMode: normalizedMode,
            partnerId: pending.partnerId ?? partner?.partnerId,
            partnerCode: pending.partnerCode ?? pending.promoCode ?? partner?.partnerCode,
            partnerName: pending.partnerName ?? partner?.partnerName,
            venueId: pending.venueId ?? partner?.venueId,
            pickupLocked: pending.pickupLocked ?? partner?.pickupLocked,
            dropoffLocked: pending.dropoffLocked ?? partner?.dropoffLocked,
            venueAccessBookingType:
                pending.venueAccessBookingType ?? partner?.venueAccessBookingType,
            allowedVehicleTypeIds: partner?.allowedVehicleTypeIds,
            discountPct: pending.discountPct ?? partner?.discountPct,
            pickupAddress: {
                text: pending.pickupLocationText ?? partner?.pickupLocation?.text ?? "",
                placeId: pending.pickupLocationPlaceId ?? partner?.pickupLocation?.placeId ?? "",
            },
            dropoffAddress: {
                text: pending.dropoffLocationText ?? partner?.dropoffLocation?.text ?? "",
                placeId: pending.dropoffLocationPlaceId ?? partner?.dropoffLocation?.placeId ?? "",
            },
            estimatedDurationHours: pending.estimatedDurationHours,
            routeDistanceMiles: pending.routeDistanceMiles,
            routeDurationText: pending.routeDurationText,
            freeRouting: false,
        };

        const hasTripData = isVenueAccess
            ? !!(loaded.pickupAddress.text && loaded.pickupDate && loaded.pickupTime)
            : !!(
                loaded.pickupDate && loaded.pickupTime &&
                loaded.dropoffDate && loaded.dropoffTime &&
                loaded.vehicleTypeId
            );

        if (hasTripData) {
            setWizardState({
                step: 2,
                fromQuickBooking: true,
                quickBookingMode: normalizedMode,
                data: loaded,
            });
            onStepChange?.(2);
        } else {
            setWizardState((prev) => ({
                ...prev,
                quickBookingMode: normalizedMode,
                data: loaded,
            }));
            onStepChange?.(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Resolve region/vehicle IDs for venue access when only names were provided
    useEffect(() => {
        if (data.bookingMode !== "venue_access") return;
        if (data.regionId && data.vehicleTypeId) return;

        Promise.all([getRegions(), getVehicleTypes()])
            .then(([regionsRes, vehiclesRes]) => {
                const regions = regionsRes.data ?? [];
                const vehicles = vehiclesRes.data ?? [];
                const patch: Partial<BookingData> = {};

                if (!data.regionId && data.region) {
                    const found = regions.find(
                        (r) => r.name.toLowerCase() === data.region.toLowerCase(),
                    );
                    if (found) patch.regionId = found._id;
                }
                if (!data.vehicleTypeId && data.vehicleType) {
                    const found = vehicles.find(
                        (v) => v.name.toLowerCase() === data.vehicleType.toLowerCase(),
                    );
                    if (found) {
                        patch.vehicleTypeId = found._id;
                        patch.vehicleHourlyRate = found.hourlyPrice;
                        patch.vehicleType = found.name;
                    }
                }
                if (Object.keys(patch).length > 0) {
                    setData((prev) => ({ ...prev, ...patch }));
                }
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.bookingMode, data.region, data.vehicleType]);

    // Fetch addons once on mount
    useEffect(() => {
        fetchAddons(getToken() ?? undefined)
            .then((res) => {
                if (res.data) {
                    setFreeAddons(res.data.free);
                    setPaidAddons(res.data.paid);
                }
            })
            .catch(() => { /* silently ignore */ })
            .finally(() => setAddonsLoading(false));
    }, []);

    // Recalculate price whenever data changes (debounced 600ms)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            if (!data.vehicleTypeId) return;
            if (data.bookingMode === "venue_access") {
                if (!data.dropoffAddress.text || !data.estimatedDurationHours) return;
            } else if (!data.dropoffDate || !data.dropoffTime) {
                return;
            }
            setPriceLoading(true);
            try {
                const token = getToken() ?? undefined;
                const res = await calculateBookingPrice(data, token);
                if (res.data) setServerPrice(res.data);
            } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Failed to calculate price.");
            } finally {
                setPriceLoading(false);
            }
        }, 600);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [data]);

    function goTo(s: Step) {
        setStep(s);
    }

    function handleChange(patch: Partial<BookingData>) {
        setWizardState((prev) => {
            const nextData = { ...prev.data, ...patch };
            const nextMode =
                patch.bookingMode && patch.bookingMode !== "venue_access"
                    ? patch.bookingMode
                    : prev.quickBookingMode;
            return {
                ...prev,
                data: nextData,
                quickBookingMode:
                    patch.bookingMode === "venue_access"
                        ? "venue_access"
                        : patch.bookingMode === "buy_hours" || patch.bookingMode === "multi_day"
                            ? patch.bookingMode
                            : nextMode,
            };
        });
    }

    async function handleConfirm() {
        if (sameDay.blocked) {
            toast.error(
                sameDay.status?.message ??
                "Same-day booking is currently unavailable for this region.",
            );
            return;
        }
        setIsSubmitting(true);
        try {
            const token = getToken() ?? undefined;
            const res = await startBooking(data, token);
            const bookingId = res.data?.booking?._id;
            if (!bookingId) {
                toast.error("Booking created but no booking ID returned.");
                return;
            }
            clearPendingBooking();
            setPendingBookingId(bookingId);
            setStep(4);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to create booking.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (paymentComplete) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-aleet-gold/30 bg-aleet-gold/10 text-aleet-gold">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
                        <path d="m5 13 4 4L19 7" />
                    </svg>
                </div>
                <h2 className="mb-2 font-serif text-[24px] font-medium text-aleet-text">Payment Complete</h2>
                <p className="max-w-sm text-[14px] text-aleet-text-muted">
                    Your trip is confirmed and paid. You&apos;ll get a confirmation email shortly.
                </p>
                <Link
                    href="/dashboard"
                    className="mt-8 inline-flex items-center gap-2 rounded-xl border border-aleet-gold/30 bg-aleet-gold/10 px-5 py-2.5 text-[13px] font-medium text-aleet-gold transition-colors hover:bg-aleet-gold/20"
                >
                    View my bookings →
                </Link>
            </div>
        );
    }

    const clientEstimate = data.vehicleHourlyRate > 0 && data.quantity > 0
        ? (() => {
            const { pickupDate, dropoffDate, pickupTime, dropoffTime } = data;
            if (!pickupDate || !dropoffDate || !pickupTime || !dropoffTime) return null;
            const parseTime = (t: string) => {
                const m = t.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
                if (!m) return null;
                let h = parseInt(m[1], 10);
                const min = parseInt(m[2], 10);
                const period = m[3]?.toUpperCase();
                if (period === "PM" && h !== 12) h += 12;
                if (period === "AM" && h === 12) h = 0;
                return { h, min };
            };
            const p = parseTime(pickupTime);
            const d = parseTime(dropoffTime);
            if (!p || !d) return null;
            const pickupMs = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate(), p.h, p.min).getTime();
            const dropoffMs = new Date(dropoffDate.getFullYear(), dropoffDate.getMonth(), dropoffDate.getDate(), d.h, d.min).getTime();
            const diff = (dropoffMs - pickupMs) / 3600000;
            if (diff <= 0) return null;
            return data.vehicleHourlyRate * data.quantity * diff;
        })()
        : null;

    const priceBarEl = (
        <PriceBar
            serverPrice={serverPrice}
            priceLoading={priceLoading}
            clientEstimate={clientEstimate}
        />
    );

    const partnerContext = data.partnerName
        ? {
            partnerId: data.partnerId ?? "",
            partnerCode: data.partnerCode ?? "",
            partnerName: data.partnerName,
            partnerType: "venue" as const,
            bookingMode: data.bookingMode === "venue_access" ? "venue_access" as const : "standard" as const,
            venueId: data.venueId,
            pickupLocation: data.pickupAddress,
            pickupLocked: data.pickupLocked,
            discountPct: data.discountPct,
          }
        : loadPartnerContext();

    return (
        <div>
            {renderIndicator?.(step, fromQuickBooking)}
            <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
                {partnerContext && step >= 2 ? (
                    <PartnerContextBanner partner={partnerContext} className="mb-5" compact />
                ) : null}
                {step === 1 && !fromQuickBooking && (
                    <StepTrip data={data} onChange={handleChange} onNext={() => goTo(2)} priceBar={priceBarEl} isMember={isMember} sameDay={sameDay} />
                )}
                {step === 2 && (
                    <>
                        {fromQuickBooking && (
                            <TripSummaryBar data={data} onChange={handleChange} quickBookingMode={quickBookingMode} isMember={isMember} />
                        )}
                        <SameDayNotice sameDay={sameDay} />
                        <StepRoute
                            data={data}
                            quickBookingMode={quickBookingMode}
                            serverPrice={serverPrice}
                            priceLoading={priceLoading}
                            onChange={handleChange}
                            onNext={() => goTo(3)}
                            onBack={fromQuickBooking ? undefined : () => goTo(1)}
                            priceBar={priceBarEl}
                            freeAddons={freeAddons}
                            paidAddons={paidAddons}
                            addonsLoading={addonsLoading}
                        />
                    </>
                )}
                {step === 3 && (
                    <>
                        {fromQuickBooking && (
                            <TripSummaryBar data={data} onChange={handleChange} quickBookingMode={quickBookingMode} isMember={isMember} />
                        )}
                        <SameDayNotice sameDay={sameDay} />
                        <StepConfirm
                            data={data}
                            serverPrice={serverPrice}
                            priceLoading={priceLoading}
                            freeAddons={freeAddons}
                            paidAddons={paidAddons}
                            onBack={() => goTo(2)}
                            onConfirm={handleConfirm}
                            isLoading={isSubmitting}
                            confirmDisabled={sameDay.blocked}
                        />
                    </>
                )}
                {step === 4 && pendingBookingId && (
                    <BookingPaymentStep
                        bookingId={pendingBookingId}
                        amount={serverPrice?.total ?? 0}
                        onBack={() => setStep(3)}
                        onPaid={() => setPaymentComplete(true)}
                    />
                )}
            </main>
        </div>
    );
}

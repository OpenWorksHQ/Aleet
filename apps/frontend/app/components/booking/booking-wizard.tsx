"use client";

import { Fragment, useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { Pencil, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { EMPTY_BOOKING, type BookingData } from "./booking-types";
import { StepTrip } from "./step-trip";
import { StepRoute } from "./step-route";
import { StepConfirm } from "./step-confirm";
import { buildTripWindow, calculateBookingPrice, startBooking, type BookingPriceResult } from "@/lib/api/bookings";
import { fetchAddons, type ApiAddon } from "@/lib/api/addons";
import { getVehicleTypes, type VehicleType } from "@/lib/api/vehicle-types";
import { getRegions, type Region } from "@/lib/api/regions";
import { PriceBar } from "./price-bar";
import { getToken } from "@/lib/auth";
import { getProfile } from "@/lib/api/users";
import { ApiError } from "@/lib/api";
import { toast, DatePicker, TimePicker, Select } from "@/app/components/ui";
import { CarIcon, MapPinIcon } from "@/app/components/ui/icons";
import type { SelectOption } from "@/app/components/ui/select";
import {
    isPickupTimeDisabled,
    isDropoffTimeDisabled,
    slotFromTimeStr,
    combineDateAndTime,
} from "@/lib/booking-constraints";
import { loadPendingBooking, clearPendingBooking } from "@/lib/pending-booking";
import { loadPartnerContext } from "@/lib/partner/attribution";
import { filterVehiclesByPartner } from "@/lib/partner/venue-access";
import { useSameDayAvailability } from "@/lib/use-same-day-availability";
import { SameDayNotice } from "./same-day-notice";
import { PartnerContextBanner } from "@/app/components/partner/partner-context-banner";

type Step = 1 | 2 | 3;

const STEPS: { label: string; sub: string }[] = [
    { label: "Trip", sub: "Dates & vehicle" },
    { label: "Route", sub: "Locations & extras" },
    { label: "Confirm", sub: "Review & book" },
];
// ── Trip Summary Bar ────────────────────────────────────────────────────────

function TripSummaryBar({
    data,
    onChange,
    quickBookingMode,
    isMember = false,
}: {
    data: BookingData;
    onChange: (patch: Partial<BookingData>) => void;
    quickBookingMode: "buy_hours" | "multi_day" | "venue_access" | null;
    isMember?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [vehicleOptions, setVehicleOptions] = useState<SelectOption[]>([]);
    const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);

    useEffect(() => {
        getVehicleTypes()
            .then((res) => {
                const types = filterVehiclesByPartner(res.data ?? [], data.allowedVehicleTypeIds);
                setVehicleTypes(types);
                setVehicleOptions(types.map((v) => ({ label: v.name, price: `$${v.hourlyPrice}/hr` })));
            })
            .catch(() => { });
        getRegions()
            .then((res) => {
                const list = res.data ?? [];
                setRegions(list);
                setRegionOptions(list.map((r: Region) => ({ label: r.name })));
            })
            .catch(() => { });
    }, [data.allowedVehicleTypeIds]);

    const hasFullData = data.pickupDate && data.pickupTime && data.dropoffDate && data.dropoffTime;
    const isBuyHours = quickBookingMode === "buy_hours";

    const fmt = (d: Date) => format(d, "MMM d, yyyy");

    function handleRegionChange(display: string) {
        const found = regions.find((r) => r.name === display);
        onChange({ region: display, regionId: found?._id ?? "" });
    }

    function handleVehicleChange(display: string) {
        const name = display.split(" $")[0];
        const found = vehicleTypes.find((v) => v.name === name);
        onChange({
            vehicleType: display,
            vehicleTypeId: found?._id ?? "",
            vehicleHourlyRate: found?.hourlyPrice ?? 0,
        });
    }

    function handlePickupDateChange(d: Date | undefined) {
        const patch: Partial<BookingData> = { pickupDate: d };
        if (d && data.dropoffDate && data.dropoffDate < d) {
            patch.dropoffDate = undefined;
            patch.dropoffTime = "";
        }
        onChange(patch);
    }

    function handlePickupTimeChange(t: string) {
        const patch: Partial<BookingData> = { pickupTime: t };
        if (data.pickupDate && data.dropoffDate && data.dropoffTime) {
            const invalid = isDropoffTimeDisabled(data.pickupDate, t, data.dropoffDate, slotFromTimeStr(data.dropoffTime), isMember);
            if (invalid) patch.dropoffTime = "";
        }
        onChange(patch);
    }

    function handleDropoffDateChange(d: Date | undefined) {
        const patch: Partial<BookingData> = { dropoffDate: d };
        if (!data.dropoffTime && data.pickupTime) {
            patch.dropoffTime = data.pickupTime;
        }
        if (d && data.pickupDate && data.pickupTime && data.dropoffTime) {
            const invalid = isDropoffTimeDisabled(data.pickupDate, data.pickupTime, d, slotFromTimeStr(data.dropoffTime), isMember);
            if (invalid) patch.dropoffTime = "";
        }
        onChange(patch);
    }

    function getDurationHours(): number | null {
        if (!data.pickupDate || !data.pickupTime || !data.dropoffDate || !data.dropoffTime) return null;
        const start = combineDateAndTime(data.pickupDate, data.pickupTime);
        const end = combineDateAndTime(data.dropoffDate, data.dropoffTime);
        if (!start || !end) return null;
        const diff = (end.getTime() - start.getTime()) / 3_600_000;
        if (diff <= 0) return null;
        return Math.round(diff * 100) / 100;
    }

    function formatTimeFromDate(date: Date): string {
        const h24 = date.getHours();
        const m = String(date.getMinutes()).padStart(2, "0");
        const period = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${String(h12).padStart(2, "0")}:${m} ${period}`;
    }

    function handleDurationChange(nextDuration: number) {
        if (!data.pickupDate || !data.pickupTime) return;
        const start = combineDateAndTime(data.pickupDate, data.pickupTime);
        if (!start) return;
        const end = new Date(start.getTime() + nextDuration * 3_600_000);
        onChange({
            dropoffDate: end,
            dropoffTime: formatTimeFromDate(end),
        });
    }

    if (!editing && hasFullData) {
        const items = [
            { label: "Pick-up", value: `${fmt(data.pickupDate!)} · ${data.pickupTime}` },
            { label: "Drop-off", value: `${fmt(data.dropoffDate!)} · ${data.dropoffTime}` },
            ...(isBuyHours && getDurationHours() ? [{ label: "Duration", value: `${getDurationHours()}h` }] : []),
            ...(data.vehicleType ? [{ label: "Vehicle", value: data.vehicleType }] : []),
            ...(data.region ? [{ label: "Region", value: data.region }] : []),
            ...(data.quantity > 1 ? [{ label: "Qty", value: String(data.quantity) }] : []),
        ];

        return (
            <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-aleet-border bg-aleet-card px-4 py-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {items.map((item) => (
                        <div key={item.label} className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
                                {item.label}
                            </span>
                            <span className="text-[13px] font-medium text-aleet-text">{item.value}</span>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    title="Edit trip details"
                    className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-aleet-border px-2.5 py-1.5 text-[12px] font-medium text-aleet-gold transition-colors hover:border-aleet-gold/40 hover:bg-aleet-gold/10"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </button>
            </div>
        );
    }

    function handleDone() {
        if (!data.pickupDate || !data.pickupTime || !data.dropoffDate || !data.dropoffTime) {
            toast.error("Please fill in all date and time fields before closing.");
            return;
        }
        setEditing(false);
    }

    return (
        <div className="mb-5 rounded-xl border border-aleet-gold/30 bg-aleet-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-aleet-text-subtle">Edit Trip Details</p>
                <button
                    type="button"
                    onClick={handleDone}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-aleet-gold/30 bg-aleet-gold/10 px-2.5 py-1.5 text-[12px] font-medium text-aleet-gold transition-colors hover:bg-aleet-gold/20"
                >
                    <ChevronUp className="h-3.5 w-3.5" />
                    Done
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DatePicker label="Pick Up Date" value={data.pickupDate} onChange={handlePickupDateChange} />
                <TimePicker
                    label="Pick Up Time"
                    value={data.pickupTime}
                    onChange={handlePickupTimeChange}
                    disableSlot={(slot) => isPickupTimeDisabled(data.pickupDate, slot, isMember)}
                    disabledMessage={isMember ? "Cannot select a past time" : "Earliest pick-up is 3 hours from now"}
                />
                <Select
                    label="Vehicle Type"
                    placeholder="Select Vehicle"
                    icon={<CarIcon className="h-3.5 w-3.5" />}
                    options={vehicleOptions}
                    value={data.vehicleType}
                    onChange={handleVehicleChange}
                />
                <Select
                    label="Region"
                    placeholder="Select Region"
                    icon={<MapPinIcon className="h-3.5 w-3.5" />}
                    options={regionOptions}
                    value={data.region}
                    onChange={handleRegionChange}
                />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {isBuyHours ? (
                    <div>
                        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-aleet-text-muted">Duration</p>
                        <div className="flex h-11 items-center justify-between rounded-lg border border-aleet-border-strong bg-aleet-cream px-2.5 sm:h-12">
                            <button
                                type="button"
                                onClick={() => {
                                    const current = getDurationHours() ?? 1;
                                    handleDurationChange(Math.max(1, current - 1));
                                }}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-aleet-text-muted transition-colors hover:bg-aleet-cream hover:text-aleet-text"
                            >
                                −
                            </button>
                            <span className="text-[13px] font-medium text-aleet-text">{getDurationHours() ?? 1}h</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = getDurationHours() ?? 1;
                                    handleDurationChange(Math.min(24, current + 1));
                                }}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-aleet-text-muted transition-colors hover:bg-aleet-cream hover:text-aleet-text"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <DatePicker
                            label="Drop-off Date"
                            value={data.dropoffDate}
                            onChange={handleDropoffDateChange}
                            minDate={data.pickupDate}
                        />
                        <TimePicker
                            label="Drop-off Time"
                            value={data.dropoffTime}
                            onChange={(t) => onChange({ dropoffTime: t })}
                            disableSlot={(slot) =>
                                isDropoffTimeDisabled(data.pickupDate, data.pickupTime, data.dropoffDate, slot, isMember)
                            }
                            disabledMessage={!data.dropoffDate ? "Select a drop-off date first" : "Min. 3h after pick-up time"}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

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
    const [submitted, setSubmitted] = useState(false);
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
        setData((prev) => ({ ...prev, ...patch }));
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
            await startBooking(data, token);
            clearPendingBooking();
            setSubmitted(true);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to create booking.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (submitted) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-aleet-gold/30 bg-aleet-gold/10 text-aleet-gold">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
                        <path d="m5 13 4 4L19 7" />
                    </svg>
                </div>
                <h2 className="mb-2 font-serif text-[24px] font-medium text-aleet-text">Booking Confirmed</h2>
                <p className="max-w-sm text-[14px] text-aleet-text-muted">
                    Your reservation has been received. You&apos;ll get a confirmation email shortly.
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
            </main>
        </div>
    );
}

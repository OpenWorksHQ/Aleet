"use client";

import { useEffect, useState } from "react";
import { Pencil, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import type { BookingData } from "./booking-types";
import { getVehicleTypes, type VehicleType } from "@/lib/api/vehicle-types";
import { getRegions, type Region } from "@/lib/api/regions";
import { toast, DateRangePicker, TimePicker, Select } from "@/app/components/ui";
import { CarIcon, MapPinIcon } from "@/app/components/ui/icons";
import type { SelectOption } from "@/app/components/ui/select";
import {
    isPickupTimeDisabled,
    isDropoffTimeDisabled,
    slotFromTimeStr,
    combineDateAndTime,
    minBookingHours,
} from "@/lib/booking-constraints";
import { filterVehiclesByPartner } from "@/lib/partner/venue-access";

export function TripSummaryBar({
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

    const minHours = minBookingHours(isMember);
    const isVenueAccess = quickBookingMode === "venue_access" || data.bookingMode === "venue_access";

    /** Mode from homepage / date range — not calendar spill from late-night buy-hours. */
    const isMultiDay =
        !isVenueAccess &&
        (data.bookingMode === "multi_day" || quickBookingMode === "multi_day");

    /** Same as homepage: single-day → duration stepper; multi-day → drop-off time. */
    const showDuration = !isVenueAccess && !isMultiDay;

    useEffect(() => {
        getVehicleTypes()
            .then((res) => {
                const types = filterVehiclesByPartner(res.data ?? [], data.allowedVehicleTypeIds);
                setVehicleTypes(types);
                setVehicleOptions(types.map((v) => ({ label: v.name, price: `$${v.hourlyPrice}/hr` })));
            })
            .catch(() => { });
    }, [data.allowedVehicleTypeIds]);

    useEffect(() => {
        getRegions()
            .then((res) => {
                const list = res.data ?? [];
                setRegions(list);
                setRegionOptions(list.map((r: Region) => ({ label: r.name })));
            })
            .catch(() => { });
    }, []);

    const hasFullData = data.pickupDate && data.pickupTime && data.dropoffDate && data.dropoffTime;

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

    function formatTimeFromDate(date: Date): string {
        const h24 = date.getHours();
        const m = String(date.getMinutes()).padStart(2, "0");
        const period = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${String(h12).padStart(2, "0")}:${m} ${period}`;
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

    function handleDurationChange(nextDuration: number) {
        if (!data.pickupDate || !data.pickupTime) return;
        const clamped = Math.max(minHours, Math.min(24, nextDuration));
        const start = combineDateAndTime(data.pickupDate, data.pickupTime);
        if (!start) return;
        const end = new Date(start.getTime() + clamped * 3_600_000);
        onChange({
            dropoffDate: end,
            dropoffTime: formatTimeFromDate(end),
            bookingMode: "buy_hours",
        });
    }

    function handlePickupTimeChange(t: string) {
        const patch: Partial<BookingData> = { pickupTime: t };
        if (data.pickupDate && data.dropoffDate && data.dropoffTime) {
            const invalid = isDropoffTimeDisabled(
                data.pickupDate,
                t,
                data.dropoffDate,
                slotFromTimeStr(data.dropoffTime),
                isMember,
            );
            if (invalid) patch.dropoffTime = "";
        }
        if (showDuration && data.pickupDate) {
            const current = Math.max(minHours, getDurationHours() ?? minHours);
            const start = combineDateAndTime(data.pickupDate, t);
            if (start) {
                const end = new Date(start.getTime() + current * 3_600_000);
                patch.dropoffDate = end;
                patch.dropoffTime = formatTimeFromDate(end);
            }
        }
        onChange(patch);
    }

    function handleDateRangeChange(range: { from: Date; to: Date } | undefined) {
        if (!range?.from) {
            onChange({
                pickupDate: undefined,
                dropoffDate: undefined,
                dropoffTime: "",
            });
            return;
        }

        const from = range.from;
        const to = range.to ?? range.from;
        const multiDay =
            from.getFullYear() !== to.getFullYear() ||
            from.getMonth() !== to.getMonth() ||
            from.getDate() !== to.getDate();

        if (multiDay) {
            onChange({
                pickupDate: from,
                dropoffDate: to,
                dropoffTime: data.dropoffTime || "12:00 PM",
                bookingMode: "multi_day",
            });
            return;
        }

        const duration = Math.max(minHours, getDurationHours() ?? minHours);
        const start = data.pickupTime ? combineDateAndTime(from, data.pickupTime) : null;
        if (start) {
            const end = new Date(start.getTime() + duration * 3_600_000);
            onChange({
                pickupDate: from,
                dropoffDate: end,
                dropoffTime: formatTimeFromDate(end),
                bookingMode: isVenueAccess ? "venue_access" : "buy_hours",
            });
        } else {
            onChange({
                pickupDate: from,
                dropoffDate: from,
                bookingMode: isVenueAccess ? "venue_access" : "buy_hours",
            });
        }
    }

    useEffect(() => {
        if (!editing || !showDuration) return;
        const current = getDurationHours();
        if (current != null && current < minHours) {
            handleDurationChange(minHours);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, showDuration, minHours]);

    if (!editing && hasFullData) {
        const items = [
            {
                label: isMultiDay ? "Dates" : "Pick-up",
                value: isMultiDay
                    ? `${fmt(data.pickupDate!)} – ${fmt(data.dropoffDate!)} · ${data.pickupTime}`
                    : `${fmt(data.pickupDate!)} · ${data.pickupTime}`,
            },
            { label: "Drop-off", value: `${fmt(data.dropoffDate!)} · ${data.dropoffTime}` },
            ...(showDuration && getDurationHours()
                ? [{ label: "Duration", value: `${getDurationHours()}h` }]
                : []),
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
        if (showDuration) {
            const hours = getDurationHours();
            if (hours == null || hours < minHours) {
                toast.error(
                    isMember
                        ? "Duration must be at least 1 hour."
                        : "Duration must be at least 3 hours for non-members.",
                );
                return;
            }
        }
        setEditing(false);
    }

    const durationDisplay = Math.max(minHours, getDurationHours() ?? minHours);

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
                <DateRangePicker
                    label="Date"
                    startDate={data.pickupDate}
                    endDate={isMultiDay ? data.dropoffDate : data.pickupDate}
                    onChange={handleDateRangeChange}
                />
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
                {showDuration ? (
                    <div>
                        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-aleet-text-muted">
                            Duration{!isMember ? " (min 3h)" : ""}
                        </p>
                        <div className="flex h-11 items-center justify-between rounded-lg border border-aleet-border-strong bg-aleet-cream px-2.5 sm:h-12">
                            <button
                                type="button"
                                onClick={() => handleDurationChange(durationDisplay - 1)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-aleet-text-muted transition-colors hover:bg-aleet-cream hover:text-aleet-text"
                            >
                                −
                            </button>
                            <span className="text-[13px] font-medium text-aleet-text tabular-nums">{durationDisplay}h</span>
                            <button
                                type="button"
                                onClick={() => handleDurationChange(durationDisplay + 1)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-aleet-text-muted transition-colors hover:bg-aleet-cream hover:text-aleet-text"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ) : (
                    <TimePicker
                        label="Drop-off Time"
                        value={data.dropoffTime}
                        onChange={(t) => onChange({ dropoffTime: t, bookingMode: "multi_day" })}
                        disableSlot={(slot) =>
                            isDropoffTimeDisabled(
                                data.pickupDate,
                                data.pickupTime,
                                data.dropoffDate,
                                slot,
                                isMember,
                            )
                        }
                        disabledMessage={
                            !data.dropoffDate
                                ? "Select dates first"
                                : isMember
                                    ? "Must be after pick-up"
                                    : "Min. 3h after pick-up time"
                        }
                    />
                )}
            </div>
        </div>
    );
}

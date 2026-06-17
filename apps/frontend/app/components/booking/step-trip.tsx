"use client";

import { useEffect, useState } from "react";
import { DatePicker, TimePicker, Select } from "@/app/components/ui";
import { CarIcon, MapPinIcon } from "@/app/components/ui/icons";
import type { SelectOption } from "@/app/components/ui/select";
import { getVehicleTypes, type VehicleType } from "@/lib/api/vehicle-types";
import { getRegions, type Region } from "@/lib/api/regions";
import { Button } from "@/app/components/ui";
import {
    isPickupTimeDisabled,
    isDropoffTimeDisabled,
    slotFromTimeStr,
} from "@/lib/booking-constraints";
import type { BookingData } from "./booking-types";
import { SameDayNotice } from "./same-day-notice";
import type { SameDayAvailability } from "@/lib/use-same-day-availability";

type Props = {
    data: BookingData;
    onChange: (patch: Partial<BookingData>) => void;
    onNext: () => void;
    priceBar?: React.ReactNode;
    isMember?: boolean;
    sameDay: SameDayAvailability;
};

export function StepTrip({ data, onChange, onNext, priceBar, isMember = false, sameDay }: Props) {
    const [vehicleOptions, setVehicleOptions] = useState<SelectOption[]>([]);
    const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);

    useEffect(() => {
        getVehicleTypes()
            .then((res) => {
                const types = res.data ?? [];
                setVehicleTypes(types);
                setVehicleOptions(types.map((v) => ({ label: v.name, price: `$${v.hourlyPrice}/hr` })));
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        getRegions()
            .then((res) => {
                const list = res.data ?? [];
                setRegions(list);
                setRegionOptions(list.map((r: Region) => ({ label: r.name })));
            })
            .catch(() => { });
    }, []);

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

    // Reset drop-off when pickup date moves outside the valid window
    function handlePickupDateChange(d: Date | undefined) {
        const patch: Partial<BookingData> = { pickupDate: d };
        if (d && data.dropoffDate && data.dropoffDate < d) {
            patch.dropoffDate = undefined;
            patch.dropoffTime = "";
        }
        onChange(patch);
    }

    // Reset drop-off time when pickup time invalidates the combo
    function handlePickupTimeChange(t: string) {
        const patch: Partial<BookingData> = { pickupTime: t };
        if (data.pickupDate && data.dropoffDate && data.dropoffTime) {
            const invalid = isDropoffTimeDisabled(data.pickupDate, t, data.dropoffDate, slotFromTimeStr(data.dropoffTime), isMember);
            if (invalid) patch.dropoffTime = "";
        }
        onChange(patch);
    }

    // Re-validate drop-off time when drop-off date changes
    function handleDropoffDateChange(d: Date | undefined) {
        const patch: Partial<BookingData> = { dropoffDate: d };
        // Pre-fill drop-off time with pickup time if not yet set
        if (!data.dropoffTime && data.pickupTime) {
            patch.dropoffTime = data.pickupTime;
        }
        // If a drop-off time is already selected, re-validate it against the new date
        if (d && data.pickupDate && data.pickupTime && data.dropoffTime) {
            const invalid = isDropoffTimeDisabled(data.pickupDate, data.pickupTime, d, slotFromTimeStr(data.dropoffTime), isMember);
            if (invalid) patch.dropoffTime = "";
        }
        onChange(patch);
    }

    const durationHours = data.pickupDate && data.dropoffDate && data.pickupTime && data.dropoffTime
        ? (() => {
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
            const p = parseTime(data.pickupTime);
            const d = parseTime(data.dropoffTime);
            if (!p || !d) return 0;
            const start = new Date(data.pickupDate.getFullYear(), data.pickupDate.getMonth(), data.pickupDate.getDate(), p.h, p.min).getTime();
            const end = new Date(data.dropoffDate.getFullYear(), data.dropoffDate.getMonth(), data.dropoffDate.getDate(), d.h, d.min).getTime();
            const h = (end - start) / 3600000;
            return h > 0 ? h : 0;
        })()
        : null;

    const estimatedCost = durationHours && data.vehicleHourlyRate > 0
        ? durationHours * data.vehicleHourlyRate * data.quantity
        : null;

    const isDurationValid =
        durationHours !== null && (isMember ? durationHours > 0 : durationHours >= 3);

    const isValid =
        !!data.pickupDate &&
        !!data.pickupTime &&
        !!data.dropoffDate &&
        !!data.dropoffTime &&
        !!data.vehicleType &&
        !!data.region &&
        isDurationValid &&
        !sameDay.blocked;

    return (
        <div>
            <h2 className="mb-1 text-[22px] font-semibold tracking-tight text-white sm:text-[26px]">
                Trip Details
            </h2>
            <p className="mb-6 text-[13px] text-white/50 sm:text-[15px]">
                Select your dates, vehicle type, and region to get started.
            </p>

            {/* ── Dates & Vehicle ── */}
            <div className="rounded-2xl border border-[#1e2a2c] bg-[#0c1211] p-4 sm:p-6">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#3a5060]">Schedule</p>

                {/* Row 1 */}
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

                {/* Row 2 */}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    {/* Duration + cost indicator */}
                    <div className="col-span-2 flex items-end">
                        <div className={`flex h-11 w-full items-center gap-2 rounded-lg border px-3 sm:h-12 ${durationHours !== null && !isDurationValid ? "border-red-500/40 bg-red-950/20" : "border-[#1e2a2c] bg-[#111918]/60"}`}>
                            <span className="text-[#bca066]/60">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                            </span>
                            {durationHours !== null ? (
                                <span className={`text-[13px] ${isDurationValid ? "text-white/60" : "text-red-400/80"}`}>
                                    {durationHours.toFixed(1)}h duration
                                    {!isDurationValid && (
                                        <span className="ml-1 text-red-400/60">
                                            (min 3h)
                                        </span>
                                    )}
                                    {isDurationValid && estimatedCost !== null && (
                                        <span className="ml-2 text-[#bca066]">
                                            · ${estimatedCost.toFixed(0)} est. total
                                        </span>
                                    )}
                                </span>
                            ) : (
                                <span className="text-[13px] text-white/25">Select dates to see duration</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Same-day availability — styled inline notice + Continue gate */}
            <SameDayNotice sameDay={sameDay} />

            <div className="mt-6">
                {priceBar}
                <Button
                    className="w-full"
                    disabled={!isValid}
                    onClick={onNext}
                >
                    Continue to Route →
                </Button>
            </div>
        </div>
    );
}

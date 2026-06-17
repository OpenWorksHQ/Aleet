"use client";

import { Loader2 } from "lucide-react";
import { DatePicker, TimePicker, Select } from "../ui";
import { CarIcon, MapPinIcon } from "../ui/icons";
import { cn } from "@/lib/utils";
import { isPickupTimeDisabled, isDropoffTimeBeforePickup } from "@/lib/booking-constraints";
import type { SelectOption } from "../ui/select";

type MultiDayBookingFormProps = {
    pickupDate: Date | undefined;
    pickupTime: string;
    dropoffDate: Date | undefined;
    dropoffTime: string;
    vehicle: string;
    state: string;
    vehicleOptions: SelectOption[];
    regionOptions: SelectOption[];
    isLoading: boolean;
    isBookingDisabled: boolean;
    isMember?: boolean;
    onPickupDateChange: (date: Date | undefined) => void;
    onPickupTimeChange: (time: string) => void;
    onDropoffDateChange: (date: Date | undefined) => void;
    onDropoffTimeChange: (time: string) => void;
    onVehicleChange: (value: string) => void;
    onStateChange: (value: string) => void;
    onQuickBooking: () => void;
};

export function MultiDayBookingForm({
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    vehicle,
    state,
    vehicleOptions,
    regionOptions,
    isLoading,
    isBookingDisabled,
    isMember = false,
    onPickupDateChange,
    onPickupTimeChange,
    onDropoffDateChange,
    onDropoffTimeChange,
    onVehicleChange,
    onStateChange,
    onQuickBooking,
}: MultiDayBookingFormProps) {
    return (
        <section className="rounded-2xl border border-[#2a3336] bg-[rgba(12,18,17,0.82)] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <DatePicker label="Pick Up Date" value={pickupDate} onChange={onPickupDateChange} />
                <TimePicker
                    label="Pick Up Time"
                    value={pickupTime}
                    onChange={onPickupTimeChange}
                    disableSlot={(slot) => isPickupTimeDisabled(pickupDate, slot, isMember)}
                    disabledMessage={isMember ? "Cannot select a past time" : "Earliest pick-up is 3 hours from now"}
                />
                <Select
                    label="Vehicle Type"
                    placeholder="Select Vehicle"
                    icon={<CarIcon className="h-3.5 w-3.5" />}
                    options={vehicleOptions}
                    value={vehicle}
                    onChange={onVehicleChange}
                />
                <Select
                    label="State"
                    placeholder="Select State"
                    icon={<MapPinIcon className="h-3.5 w-3.5" />}
                    options={regionOptions}
                    value={state}
                    onChange={onStateChange}
                />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
                <DatePicker
                    label="Drop-off Date"
                    value={dropoffDate}
                    onChange={onDropoffDateChange}
                    minDate={pickupDate}
                />
                <TimePicker
                    label="Drop-off Time"
                    value={dropoffTime}
                    onChange={onDropoffTimeChange}
                    disableSlot={(slot) => isDropoffTimeBeforePickup(pickupDate, pickupTime, dropoffDate, slot)}
                    disabledMessage="Must be after pick-up time"
                />
                <button
                    type="button"
                    aria-disabled={isBookingDisabled}
                    onClick={isBookingDisabled ? undefined : onQuickBooking}
                    className={cn(
                        "col-span-2 mt-1 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#4a171a] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#5a1e22] sm:col-span-2 sm:mt-6 sm:h-12 sm:text-[15px]",
                        isBookingDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                    )}
                >
                    {isLoading && <Loader2 className="mr-2 h-[1em] w-[1em] animate-spin" />}
                    Quick Booking (3+ Hrs)
                </button>
            </div>
        </section>
    );
}

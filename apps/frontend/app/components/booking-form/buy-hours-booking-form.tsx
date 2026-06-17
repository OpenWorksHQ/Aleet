"use client";

import { useEffect, useMemo, useState } from "react";
import { DatePicker, TimePicker, Select, AddressAutocomplete } from "../ui";
import { CarIcon, MapPinIcon } from "../ui/icons";
import type { SelectOption } from "../ui/select";
import { cn } from "@/lib/utils";
import { isPickupTimeDisabled, slotFromTimeStr, combineDateAndTime } from "@/lib/booking-constraints";

type VehicleOption = SelectOption & { _id: string; hourlyPrice: number };
type RegionOption = SelectOption & { _id: string };

type BuyHoursPayload = {
    pickupDate: Date;
    pickupTime: string;
    dropoffDate: Date;
    dropoffTime: string;
    durationHours: number;
    vehicleDisplay: string;
    regionDisplay: string;
    dropoffLocation: { text: string; placeId: string };
};

type BuyHoursBookingFormProps = {
    vehicleList: VehicleOption[];
    regionList: RegionOption[];
    vehicleValue: string;
    stateValue: string;
    isMember?: boolean;
    onVehicleChange: (value: string) => void;
    onStateChange: (value: string) => void;
    onContinue: (payload: BuyHoursPayload) => void;
};

const LAST_REGION_KEY = "lastBookingRegion";

function todayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function nextDay(d: Date): Date {
    const n = new Date(d);
    n.setDate(n.getDate() + 1);
    n.setHours(0, 0, 0, 0);
    return n;
}

function findNearestValidPickup(defaultDate: Date): { date: Date; time: string } {
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
    const minutes = ["00", "15", "30", "45"];
    const periods = ["AM", "PM"];

    for (const period of periods) {
        for (const hour of hours) {
            for (const minute of minutes) {
                const time = `${hour}:${minute} ${period}`;
                if (!isPickupTimeDisabled(defaultDate, slotFromTimeStr(time))) {
                    return { date: defaultDate, time };
                }
            }
        }
    }

    return { date: nextDay(defaultDate), time: "12:00 AM" };
}

function pickDefaultVehicle(vehicleList: VehicleOption[]): string {
    const suv = vehicleList.find((v) => v.label.toLowerCase() === "suv");
    const first = suv ?? vehicleList[0];
    if (!first) return "";
    return first.price ? `${first.label} ${first.price}` : first.label;
}

function pickDefaultRegion(regionList: RegionOption[]): string {
    if (typeof window !== "undefined") {
        const last = window.localStorage.getItem(LAST_REGION_KEY);
        if (last && regionList.some((r) => r.label === last)) return last;

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
        const tzHints = tz.split("/").join(" ");
        const byTz = regionList.find((r) => tzHints.includes(r.label.toLowerCase()));
        if (byTz) return byTz.label;
    }

    return regionList[0]?.label ?? "";
}

export function BuyHoursBookingForm({
    vehicleList,
    regionList,
    vehicleValue,
    stateValue,
    isMember = false,
    onVehicleChange,
    onStateChange,
    onContinue,
}: BuyHoursBookingFormProps) {
    const initialPickup = useMemo(() => findNearestValidPickup(todayStart()), []);

    const [pickupDate, setPickupDate] = useState<Date | undefined>(initialPickup.date);
    const [pickupTime, setPickupTime] = useState(initialPickup.time);
    const [durationHours, setDurationHours] = useState(3);
    const [dropoffLocationText, setDropoffLocationText] = useState("");
    const [dropoffLocationPlaceId, setDropoffLocationPlaceId] = useState("");

    // Non-members have a 3-hour minimum on buy-hours bookings; members are exempt.
    const minHours = isMember ? 1 : 3;

    const vehicleOptions: SelectOption[] = vehicleList;
    const vehicle = vehicleValue || pickDefaultVehicle(vehicleList);
    const state = stateValue || pickDefaultRegion(regionList);

    useEffect(() => {
        if (!state || typeof window === "undefined") return;
        window.localStorage.setItem(LAST_REGION_KEY, state);
    }, [state]);

    const computedDropoff = useMemo(() => {
        if (!pickupDate || !pickupTime) return null;
        const start = combineDateAndTime(pickupDate, pickupTime);
        if (!start) return null;
        const end = new Date(start.getTime() + durationHours * 3_600_000);

        const h24 = end.getHours();
        const minute = String(end.getMinutes()).padStart(2, "0");
        const period = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

        return {
            date: end,
            time: `${String(h12).padStart(2, "0")}:${minute} ${period}`,
        };
    }, [pickupDate, pickupTime, durationHours]);

    const isValid = !!pickupDate && !!pickupTime && !!vehicle && !!state && !!computedDropoff && !!dropoffLocationText;

    return (
        <section className="rounded-2xl border border-[#2a3336] bg-[rgba(12,18,17,0.82)] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <DatePicker label="Pick Up Date" value={pickupDate} onChange={setPickupDate} />
                <TimePicker
                    label="Pick Up Time"
                    value={pickupTime}
                    onChange={setPickupTime}
                    disableSlot={(slot) => isPickupTimeDisabled(pickupDate, slot, isMember)}
                    disabledMessage={isMember ? "Cannot select a past time" : "Earliest pick-up is 3 hours from now"}
                />
                <div>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-[#7a8a9a]">Duration</p>
                    <div className="flex h-11 items-center justify-between rounded-lg border border-[#2e3638] bg-[#1e2527] px-2.5 sm:h-12">
                        <button
                            type="button"
                            onClick={() => setDurationHours((prev) => Math.max(minHours, prev - 1))}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white/70 transition-colors hover:bg-[#2a3336] hover:text-white"
                        >
                            −
                        </button>
                        <span className="text-[13px] font-medium text-white">{durationHours}h</span>
                        <button
                            type="button"
                            onClick={() => setDurationHours((prev) => Math.min(24, prev + 1))}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white/70 transition-colors hover:bg-[#2a3336] hover:text-white"
                        >
                            +
                        </button>
                    </div>
                </div>
                <Select
                    label="Vehicle Type"
                    placeholder="Select Vehicle"
                    icon={<CarIcon className="h-3.5 w-3.5" />}
                    options={vehicleOptions}
                    value={vehicle}
                    onChange={onVehicleChange}
                />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
                <Select
                    label="State"
                    placeholder="Select State"
                    icon={<MapPinIcon className="h-3.5 w-3.5" />}
                    options={regionList}
                    value={state}
                    onChange={onStateChange}
                />
                <div className="col-span-2">
                    <AddressAutocomplete
                        label="Drop-Off Location"
                        value={dropoffLocationText}
                        onChange={(v) => {
                            setDropoffLocationText(v);
                            if (!v) setDropoffLocationPlaceId("");
                        }}
                        onPlaceChange={(place) => {
                            setDropoffLocationText(place.text);
                            setDropoffLocationPlaceId(place.placeId);
                        }}
                        placeholder="Enter drop-off address"
                    />
                </div>
                <div className="col-span-2 flex items-end sm:col-span-1">
                    <button
                        type="button"
                        aria-disabled={!isValid}
                        onClick={() => {
                            if (!pickupDate || !computedDropoff) return;
                            onContinue({
                                pickupDate,
                                pickupTime,
                                dropoffDate: computedDropoff.date,
                                dropoffTime: computedDropoff.time,
                                durationHours,
                                vehicleDisplay: vehicle,
                                regionDisplay: state,
                                dropoffLocation: {
                                    text: dropoffLocationText,
                                    placeId: dropoffLocationPlaceId,
                                },
                            });
                        }}
                        className={cn(
                            "inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#4a171a] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#5a1e22] sm:h-12 sm:text-[15px]",
                            isValid ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                        )}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </section>
    );
}

export type { VehicleOption, RegionOption, BuyHoursPayload };

"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVehicleTypes, type VehicleType } from "@/lib/api/vehicle-types";
import { getRegions, type Region } from "@/lib/api/regions";
import { savePendingBooking } from "@/lib/pending-booking";
import { getToken } from "@/lib/auth";
import { getProfile } from "@/lib/api/users";
import {
    isDropoffTimeDisabled,
    slotFromTimeStr,
    combineDateAndTime,
    MIN_DURATION_HOURS,
} from "@/lib/booking-constraints";
import type { SelectOption } from "./ui/select";
import { toast } from "sonner";
import { BookingModeSwitch } from "./booking-form/booking-mode-switch";
import { BuyHoursBookingForm, type BuyHoursPayload, type RegionOption, type VehicleOption } from "./booking-form/buy-hours-booking-form";
import { MultiDayBookingForm } from "./booking-form/multi-day-booking-form";

type BookingMode = "buy-hours" | "multi-day";

export function BookingForm() {
    const router = useRouter();
    const [mode, setMode] = useState<BookingMode>("buy-hours");
    const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
    const [pickupTime, setPickupTime] = useState("");
    const [dropoffDate, setDropoffDate] = useState<Date | undefined>(undefined);
    const [dropoffTime, setDropoffTime] = useState("");
    const [vehicle, setVehicle] = useState("");
    const [state, setState] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [vehicleList, setVehicleList] = useState<VehicleOption[]>([]);
    const [regionList, setRegionList] = useState<RegionOption[]>([]);
    const [buyHoursVehicle, setBuyHoursVehicle] = useState("");
    const [buyHoursState, setBuyHoursState] = useState("");
    const [isMember, setIsMember] = useState(false);

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

    const handlePickupDateChange = (d: Date | undefined) => {
        setPickupDate(d);
        if (d && dropoffDate && dropoffDate < d) {
            setDropoffDate(undefined);
            setDropoffTime("");
        }
    };

    const handlePickupTimeChange = (t: string) => {
        setPickupTime(t);
        if (pickupDate && dropoffDate && dropoffTime) {
            const invalid = isDropoffTimeDisabled(pickupDate, t, dropoffDate, slotFromTimeStr(dropoffTime), isMember);
            if (invalid) setDropoffTime("");
        }
    };

    const handleDropoffDateChange = (d: Date | undefined) => {
        setDropoffDate(d);
        if (d && pickupDate && pickupTime && dropoffTime) {
            const invalid = isDropoffTimeDisabled(pickupDate, pickupTime, d, slotFromTimeStr(dropoffTime), isMember);
            if (invalid) setDropoffTime("");
        }
    };

    useEffect(() => {
        getVehicleTypes()
            .then((res) => {
                const opts: VehicleOption[] = (res.data ?? []).map((v: VehicleType) => ({
                    label: v.name,
                    price: `$${v.hourlyPrice}/hr`,
                    _id: v._id,
                    hourlyPrice: v.hourlyPrice,
                }));
                setVehicleList(opts);
                const suv = opts.find((v) => v.label.toLowerCase() === "suv");
                const first = suv ?? opts[0];
                if (first) {
                    const display = first.price ? `${first.label} ${first.price}` : first.label;
                    setBuyHoursVehicle((prev) => prev || display);
                }
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        getRegions()
            .then((res) => {
                const opts: RegionOption[] = (res.data ?? []).map((r: Region) => ({
                    label: r.name,
                    _id: r._id,
                }));
                setRegionList(opts);
                if (opts[0]) {
                    setBuyHoursState((prev) => prev || opts[0].label);
                }
            })
            .catch(() => { });
    }, []);

    const handleQuickBooking = useCallback(async () => {
        if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime || !vehicle || !state) {
            toast.error("Please fill in all fields before proceeding.");
            return;
        }

        if (isLoading) return;
        setIsLoading(true);

        const token = getToken();

        const selectedVehicle = vehicleList.find((v) => {
            const display = v.price ? `${v.label} ${v.price}` : v.label;
            return display === vehicle;
        });
        const selectedRegion = regionList.find((r) => r.label === state);

        savePendingBooking({
            pickupDate: pickupDate ? pickupDate.toISOString() : null,
            dropoffDate: dropoffDate ? dropoffDate.toISOString() : null,
            pickupTime,
            dropoffTime,
            vehicleType: selectedVehicle?.label ?? vehicle,
            vehicleTypeId: selectedVehicle?._id ?? "",
            vehicleHourlyRate: selectedVehicle?.hourlyPrice ?? 0,
            region: selectedRegion?.label ?? state,
            regionId: selectedRegion?._id ?? "",
            bookingMode: "multi_day",
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (token) {
            router.push("/booking");
        } else {
            router.push("/login?next=/booking");
        }
    }, [isLoading, vehicleList, regionList, vehicle, state, pickupDate, dropoffDate, pickupTime, dropoffTime, router]);

    const handleBuyHoursContinue = useCallback((payload: BuyHoursPayload) => {
        const selectedVehicle = vehicleList.find((v) => {
            const display = v.price ? `${v.label} ${v.price}` : v.label;
            return display === payload.vehicleDisplay;
        });
        const selectedRegion = regionList.find((r) => r.label === payload.regionDisplay);

        savePendingBooking({
            pickupDate: payload.pickupDate.toISOString(),
            dropoffDate: payload.dropoffDate.toISOString(),
            pickupTime: payload.pickupTime,
            dropoffTime: payload.dropoffTime,
            vehicleType: selectedVehicle?.label ?? payload.vehicleDisplay,
            vehicleTypeId: selectedVehicle?._id ?? "",
            vehicleHourlyRate: selectedVehicle?.hourlyPrice ?? 0,
            region: selectedRegion?.label ?? payload.regionDisplay,
            regionId: selectedRegion?._id ?? "",
            bookingMode: "buy_hours",
            dropoffLocationText: payload.dropoffLocation.text,
            dropoffLocationPlaceId: payload.dropoffLocation.placeId,
        });

        const token = getToken();
        if (token) {
            router.push("/booking");
        } else {
            router.push("/login?next=/booking");
        }
    }, [vehicleList, regionList, router]);

    const vehicleOptions: SelectOption[] = vehicleList;
    const regionOptions: SelectOption[] = regionList;

    const durationHours = (() => {
        if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) return null;
        const start = combineDateAndTime(pickupDate, pickupTime);
        const end = combineDateAndTime(dropoffDate, dropoffTime);
        if (!start || !end) return null;
        const h = (end.getTime() - start.getTime()) / 3_600_000;
        return h > 0 ? h : 0;
    })();

    const isDurationTooShort = durationHours !== null && durationHours < MIN_DURATION_HOURS && !isMember;
    const showMinimumNotice = durationHours !== null && durationHours < MIN_DURATION_HOURS && !isMember;
    const isBookingDisabled = isLoading || isDurationTooShort;

    return (
        <>
            <BookingModeSwitch mode={mode} onModeChange={setMode} />

            <div className="min-h-[236px] sm:min-h-[248px]">
                {mode === "buy-hours" && (
                    <BuyHoursBookingForm
                        vehicleList={vehicleList}
                        regionList={regionList}
                        vehicleValue={buyHoursVehicle}
                        stateValue={buyHoursState}
                        isMember={isMember}
                        onVehicleChange={setBuyHoursVehicle}
                        onStateChange={setBuyHoursState}
                        onContinue={handleBuyHoursContinue}
                    />
                )}

                {mode === "multi-day" && (
                    <MultiDayBookingForm
                        pickupDate={pickupDate}
                        pickupTime={pickupTime}
                        dropoffDate={dropoffDate}
                        dropoffTime={dropoffTime}
                        vehicle={vehicle}
                        state={state}
                        vehicleOptions={vehicleOptions}
                        regionOptions={regionOptions}
                        isLoading={isLoading}
                        isBookingDisabled={isBookingDisabled}
                        isMember={isMember}
                        onPickupDateChange={handlePickupDateChange}
                        onPickupTimeChange={handlePickupTimeChange}
                        onDropoffDateChange={handleDropoffDateChange}
                        onDropoffTimeChange={setDropoffTime}
                        onVehicleChange={setVehicle}
                        onStateChange={setState}
                        onQuickBooking={handleQuickBooking}
                    />
                )}

                {mode === "multi-day" && showMinimumNotice && (
                    <p className="mt-2.5 px-1 text-[11px] text-[#5a7080] sm:mt-3">
                        Regular bookings require a <span className="text-[#bca066]/80">3-hour minimum</span>.{" "}
                        <Link href="#" className="text-[#bca066]/80 underline underline-offset-2 hover:text-[#bca066] transition-colors">
                            Membership
                        </Link>{" "}
                        removes the minimum.
                    </p>
                )}
            </div>
        </>
    );
}

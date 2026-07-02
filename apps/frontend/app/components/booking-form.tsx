"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVehicleTypes, type VehicleType } from "@/lib/api/vehicle-types";
import { getRegions, type Region } from "@/lib/api/regions";
import { savePendingBooking } from "@/lib/pending-booking";
import { getToken } from "@/lib/auth";
import { getProfile } from "@/lib/api/users";
import {
    BuyHoursBookingForm,
    type BuyHoursPayload,
    type RegionOption,
    type VehicleOption,
} from "./booking-form/buy-hours-booking-form";

export function BookingForm() {
    const router = useRouter();
    const [vehicleList, setVehicleList] = useState<VehicleOption[]>([]);
    const [regionList, setRegionList] = useState<RegionOption[]>([]);
    const [buyHoursVehicle, setBuyHoursVehicle] = useState("");
    const [buyHoursState, setBuyHoursState] = useState("");
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        const token = getToken();
        if (!token) return;
        getProfile(token)
            .then((res) => {
                if (res.data)
                    setIsMember(
                        res.data.subscriptionStatus === "subscriber",
                    );
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        getVehicleTypes()
            .then((res) => {
                const opts: VehicleOption[] = (res.data ?? []).map(
                    (v: VehicleType) => ({
                        label: v.name,
                        price: `$${v.hourlyPrice}/hr`,
                        _id: v._id,
                        hourlyPrice: v.hourlyPrice,
                    }),
                );
                setVehicleList(opts);
                const suv = opts.find(
                    (v) => v.label.toLowerCase() === "suv",
                );
                const first = suv ?? opts[0];
                if (first) {
                    const display = first.price
                        ? `${first.label} ${first.price}`
                        : first.label;
                    setBuyHoursVehicle((prev) => prev || display);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        getRegions()
            .then((res) => {
                const opts: RegionOption[] = (res.data ?? []).map(
                    (r: Region) => ({
                        label: r.name,
                        _id: r._id,
                    }),
                );
                setRegionList(opts);
                if (opts[0]) {
                    setBuyHoursState((prev) => prev || opts[0].label);
                }
            })
            .catch(() => {});
    }, []);

    const handleContinue = useCallback(
        (payload: BuyHoursPayload) => {
            const selectedVehicle = vehicleList.find((v) => {
                const display = v.price
                    ? `${v.label} ${v.price}`
                    : v.label;
                return display === payload.vehicleDisplay;
            });
            const selectedRegion = regionList.find(
                (r) => r.label === payload.regionDisplay,
            );

            savePendingBooking({
                pickupDate: payload.pickupDate.toISOString(),
                dropoffDate: payload.dropoffDate.toISOString(),
                pickupTime: payload.pickupTime,
                dropoffTime: payload.dropoffTime,
                vehicleType:
                    selectedVehicle?.label ?? payload.vehicleDisplay,
                vehicleTypeId: selectedVehicle?._id ?? "",
                vehicleHourlyRate: selectedVehicle?.hourlyPrice ?? 0,
                region:
                    selectedRegion?.label ?? payload.regionDisplay,
                regionId: selectedRegion?._id ?? "",
                bookingMode: payload.durationHours > 0 ? "buy_hours" : "multi_day",
                dropoffLocationText: payload.dropoffLocation.text,
                dropoffLocationPlaceId: payload.dropoffLocation.placeId,
                promoCode: payload.promoCode,
            });

            const token = getToken();
            if (token) {
                router.push("/booking");
            } else {
                router.push("/login?next=/booking");
            }
        },
        [vehicleList, regionList, router],
    );

    return (
        <BuyHoursBookingForm
            vehicleList={vehicleList}
            regionList={regionList}
            vehicleValue={buyHoursVehicle}
            stateValue={buyHoursState}
            isMember={isMember}
            onVehicleChange={setBuyHoursVehicle}
            onStateChange={setBuyHoursState}
            onContinue={handleContinue}
        />
    );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVehicleTypes, type VehicleType } from "@/lib/api/vehicle-types";
import { getRegions, type Region } from "@/lib/api/regions";
import { savePendingBooking } from "@/lib/pending-booking";
import { getToken } from "@/lib/auth";
import { getProfile } from "@/lib/api/users";
import { loadPartnerContext, savePartnerContext, PARTNER_CHANGED_EVENT } from "@/lib/partner/attribution";
import { validatePartnerCode } from "@/lib/api/partners";
import { buildVenueAccessPendingBooking, filterVehiclesByPartner } from "@/lib/partner/venue-access";
import { toast } from "./ui";
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
        function applyVehicleList(partner = loadPartnerContext()) {
            getVehicleTypes()
                .then((res) => {
                    const types = res.data ?? [];
                    const filtered = filterVehiclesByPartner(types, partner?.allowedVehicleTypeIds);
                    const opts: VehicleOption[] = filtered.map(
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
                        setBuyHoursVehicle((prev) => {
                            if (!prev) return display;
                            const stillValid = opts.some((v) => {
                                const d = v.price ? `${v.label} ${v.price}` : v.label;
                                return d === prev;
                            });
                            return stillValid ? prev : display;
                        });
                    } else {
                        setBuyHoursVehicle("");
                    }
                })
                .catch(() => {});
        }

        applyVehicleList();
        const onPartnerChanged = () => applyVehicleList();
        window.addEventListener(PARTNER_CHANGED_EVENT, onPartnerChanged);
        return () => window.removeEventListener(PARTNER_CHANGED_EVENT, onPartnerChanged);
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
        async (payload: BuyHoursPayload) => {
            const selectedVehicle = vehicleList.find((v) => {
                const display = v.price
                    ? `${v.label} ${v.price}`
                    : v.label;
                return display === payload.vehicleDisplay;
            });
            const selectedRegion = regionList.find(
                (r) => r.label === payload.regionDisplay,
            );

            let partner = loadPartnerContext();

            if (payload.promoCode?.trim()) {
                const res = await validatePartnerCode(payload.promoCode.trim());
                if (!res.data) {
                    toast.error(res.message || "Partner code not recognized.");
                    return;
                }
                partner = res.data;
                savePartnerContext(partner);

                if (partner.bookingMode === "venue_access") {
                    savePendingBooking(
                        buildVenueAccessPendingBooking(partner, {
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
                            dropoffLocationText: payload.dropoffLocation.text,
                            dropoffLocationPlaceId: payload.dropoffLocation.placeId,
                            promoCode: payload.promoCode.trim(),
                        }),
                    );
                    const token = getToken();
                    router.push(token ? "/booking" : "/login?next=/booking");
                    return;
                }
            }

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
                promoCode: payload.promoCode?.trim() || partner?.partnerCode,
                partnerId: partner?.partnerId,
                partnerCode: partner?.partnerCode,
                partnerName: partner?.partnerName,
                venueId: partner?.venueId,
                discountPct: partner?.discountPct,
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

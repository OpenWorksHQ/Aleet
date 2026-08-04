"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/user-store";
import { withNgrokHeaders } from "@aleet/shared";
import { getAuthToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function DriverStatusSync() {
    const setProfile = useUserStore((s) => s.setProfile);
    const setLoading = useUserStore((s) => s.setLoading);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            setLoading(false);
            return;
        }

        const sync = async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/users/profile`, {
                    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
                    cache: "no-store",
                });
                if (!res.ok) return;

                const json = await res.json();
                const data = json.data ?? json;

                const role = (data.role ?? "").toLowerCase();
                const driverStatus = data.driver?.status ?? "";
                const tier = data.driver?.tier ?? "";
                const availabilityStatus = data.driver?.availabilityStatus ?? "off";
                const avatar =
                    data.avatar ??
                    data.profileImage ??
                    data.driver?.avatar ??
                    data.driver?.profileImage ??
                    null;

                // Client-side display state only. Routing/authorization is
                // derived from the token server-side (see lib/session.ts), so
                // no role or status is mirrored into cookies here.
                setProfile({
                    name: data.name ?? "",
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    avatar,
                    role,
                    driverStatus,
                    tier,
                    availabilityStatus,
                    revisionNotes: data.driver?.revisionNotes ?? null,
                    ssn: data.driver?.ssn ?? null,
                    licenseImage: data.driver?.licenseImage ?? null,
                    vehicleImage: data.driver?.vehicleImage ?? null,
                    forHireLicenseImage: data.driver?.forHireLicenseImage ?? null,
                    hasForHireLicense: data.driver?.hasForHireLicense ?? false,
                    hasOwnVehicle: data.driver?.hasOwnVehicle ?? false,
                    backgroundCheck: data.driver?.backgroundCheck ?? false,
                });
            } catch {
                setLoading(false);
            }
        };

        sync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

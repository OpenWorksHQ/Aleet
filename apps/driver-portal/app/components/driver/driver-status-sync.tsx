"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/user-store";
import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const COOKIE_OPTS = "path=/; max-age=604800; SameSite=Lax";

function getAuthToken(): string | null {
    if (typeof document === "undefined") return null;
    return (
        document.cookie
            .split("; ")
            .find((c) => c.startsWith("auth_token="))
            ?.split("=")[1] ?? null
    );
}

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
                const avatar =
                    data.avatar ??
                    data.profileImage ??
                    data.driver?.avatar ??
                    data.driver?.profileImage ??
                    null;

                // Keep cookies fresh so middleware has accurate state on next navigation
                document.cookie = `auth_role=${role}; ${COOKIE_OPTS}`;
                document.cookie = `driver_status=${driverStatus}; ${COOKIE_OPTS}`;

                setProfile({
                    name: data.name ?? "",
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    avatar,
                    role,
                    driverStatus,
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

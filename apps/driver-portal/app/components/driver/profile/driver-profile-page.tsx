"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useUserStore } from "@/lib/user-store";
import {
    fetchActiveRegions,
    updateMyRegions,
    type Region,
} from "@/lib/regions-api";
import { withNgrokHeaders } from "@/lib/ngrok-headers";

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="mb-1.5 block text-xs font-medium text-muted">{children}</label>;
}

/**
 * ServiceRegionsCard
 * ---------------------------------------------------------------------------
 * Lets a driver pick which regions they're willing to serve. Mirrors the
 * backend `driverServesRegion` semantics:
 *   - "Available everywhere" → serveAllRegions=true, regions=[]
 *   - "Specific regions"    → serveAllRegions=false, regions=[selected ids]
 *
 * Default for new drivers is "everywhere" — they only need to opt out.
 * ---------------------------------------------------------------------------
 */
function ServiceRegionsCard() {
    const [available, setAvailable] = useState<Region[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [serveAll, setServeAll] = useState(true);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];

        async function load() {
            try {
                // Fetch regions list + current driver settings in parallel.
                // Current settings come from /api/users/profile which now
                // includes driver.regions and driver.serveAllRegions.
                const [regions, profileRes] = await Promise.all([
                    fetchActiveRegions(),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
                        headers: withNgrokHeaders({ Authorization: `Bearer ${token ?? ""}` }),
                        cache: "no-store",
                    }).then((r) => r.json()),
                ]);
                if (cancelled) return;

                setAvailable(regions);
                const driver = profileRes?.data?.driver ?? {};
                const mine: string[] = Array.isArray(driver.regions)
                    ? driver.regions.map((r: unknown) => String(r))
                    : [];
                setSelected(new Set(mine));
                setServeAll(driver.serveAllRegions !== false);
                setInitialLoaded(true);
            } catch (err) {
                if (cancelled) return;
                toast.error(err instanceof Error ? err.message : "Failed to load regions");
                setInitialLoaded(true);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    function toggleRegion(id: string) {
        if (serveAll) return; // checkboxes are locked while "everywhere" is on
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleSave() {
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) return toast.error("Session expired. Please log in again.");

        // Warn (but allow) if driver is opting out of every region.
        if (!serveAll && selected.size === 0) {
            const ok = window.confirm(
                "You've unchecked every region. You won't be eligible for any new trips. Continue?",
            );
            if (!ok) return;
        }

        setSaving(true);
        try {
            const body = serveAll
                ? { regions: [], serveAllRegions: true }
                : { regions: Array.from(selected), serveAllRegions: false };
            await updateMyRegions(token, body);
            toast.success("Service regions updated");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-base font-semibold text-text">Service Regions</h3>
                    <p className="text-xs text-muted">Choose which regions you&apos;re willing to accept trips in</p>
                </div>
            </div>

            {/* "Everywhere" master toggle */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-page-bg/40 p-4">
                <input
                    type="checkbox"
                    checked={serveAll}
                    onChange={(e) => setServeAll(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-gold"
                    disabled={!initialLoaded}
                />
                <div className="flex-1">
                    <p className="text-sm font-medium text-text">Available in all regions</p>
                    <p className="mt-0.5 text-xs text-muted">
                        Recommended — you&apos;ll be considered for every region Aleet currently operates in.
                    </p>
                </div>
            </label>

            {/* Region checkbox list — only enabled when serveAll is off */}
            <div className={`mt-4 ${serveAll ? "opacity-50" : ""}`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Or restrict to specific regions
                </p>
                {!initialLoaded ? (
                    <p className="text-sm text-muted">Loading…</p>
                ) : available.length === 0 ? (
                    <p className="text-sm text-muted">No regions available.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {available.map((r) => (
                            <label
                                key={r._id}
                                className={`flex items-center gap-3 rounded-xl border border-border bg-page-bg/40 px-4 py-3 ${serveAll ? "cursor-not-allowed" : "cursor-pointer hover:border-gold/40"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.has(r._id)}
                                    onChange={() => toggleRegion(r._id)}
                                    disabled={serveAll}
                                    className="h-4 w-4 accent-gold"
                                />
                                <span className="flex-1 text-sm text-text">{r.name}</span>
                                <span className="rounded-md bg-gold/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold">
                                    {r.code}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-xs text-muted">
                    {serveAll
                        ? "You'll be eligible in every region."
                        : `You'll only be eligible in ${selected.size} region${selected.size === 1 ? "" : "s"}.`}
                </p>
                <button
                    onClick={handleSave}
                    disabled={saving || !initialLoaded}
                    className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving && (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                    )}
                    Save Regions
                </button>
            </div>
        </div>
    );
}

function InputField({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    hint,
}: {
    label: string;
    value: string;
    onChange?: (v: string) => void;
    type?: string;
    placeholder?: string;
    hint?: string;
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-xl border border-border bg-page-bg px-4 text-sm text-text outline-none placeholder:text-muted transition-colors focus:border-gold/50"
            />
            {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
        </div>
    );
}

export function DriverProfilePage() {
    const profile = useUserStore((s) => s.profile);
    const profileName = profile?.name ?? "";
    const profileEmail = profile?.email ?? "";
    const profilePhone = profile?.phone ?? "";
    const profileAvatar = profile?.avatar ?? null;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Sync from store when profile loads
    useEffect(() => {
        setName(profileName);
        setEmail(profileEmail);
        setPhone(profilePhone);
    }, [profileEmail, profileName, profilePhone]);

    useEffect(() => {
        if (!avatarFile) {
            setAvatarPreview(null);
            return;
        }

        const url = URL.createObjectURL(avatarFile);
        setAvatarPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [avatarFile]);

    async function handleSave() {
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) return toast.error("Session expired. Please log in again.");

        setLoading(true);
        try {
            const form = new FormData();
            form.append("name", name);
            form.append("email", email);
            form.append("phone", phone);
            if (avatarFile) form.append("avatar", avatarFile);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/contact-info`, {
                method: "PATCH",
                headers: withNgrokHeaders({
                    Authorization: `Bearer ${token}`,
                }),
                body: form,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Update failed");

            const data = json.data ?? {};
            const nextAvatar =
                data.avatar ??
                data.profileImage ??
                data.driver?.avatar ??
                data.driver?.profileImage ??
                profileAvatar;

            useUserStore.getState().setProfile({
                ...useUserStore.getState().profile!,
                name: data.name ?? name,
                email: data.email ?? email,
                phone: data.phone ?? phone,
                avatar: nextAvatar,
            });
            setAvatarFile(null);
            toast.success("Profile updated successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    function handleAvatarPick(file: File | null) {
        if (!file) return;
        const isValidType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
        if (!isValidType) {
            toast.error("Avatar must be JPG, PNG, or WEBP.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Avatar size must be 10MB or less.");
            return;
        }

        setAvatarFile(file);
        toast.success("Avatar selected. Click Update Profile to save.");
    }

    const initials = (name || profile?.name || "D")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                {/* Header */}
                <div className="mb-6 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-text">Personal Information</h3>
                        <p className="text-xs text-muted">Update your name and contact details</p>
                    </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
                    <InputField label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                    <div className="sm:col-span-2">
                        <InputField label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+1 (555) 000-0000" />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
                    <p className="text-xs text-muted">Changes are saved to your account profile</p>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        )}
                        Update Profile
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                <div className="mb-6 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                            <path d="M23 19V7a2 2 0 0 0-2-2h-3.2a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 13.6 2h-3.2a2 2 0 0 0-1.7.9l-.8 1.2A2 2 0 0 1 6.2 5H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2Z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-text">Avatar</h3>
                        <p className="text-xs text-muted">Upload your profile photo</p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-page-bg/40 p-5">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-border bg-card-bg text-2xl font-semibold text-gold">
                        {avatarPreview || profileAvatar ? (
                            <Image
                                src={avatarPreview ?? profileAvatar ?? ""}
                                alt="Avatar preview"
                                width={112}
                                height={112}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            initials || "D"
                        )}
                    </div>

                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
                    />

                    <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {avatarFile ? "Change Avatar" : "Upload Avatar"}
                    </button>

                    <p className="text-center text-xs text-muted">
                        JPG, PNG or WEBP. Max 10MB.
                        {avatarFile ? ` Selected: ${avatarFile.name}` : ""}
                    </p>
                </div>
            </div>
            </div>

            <ServiceRegionsCard />
        </div>
    );
}

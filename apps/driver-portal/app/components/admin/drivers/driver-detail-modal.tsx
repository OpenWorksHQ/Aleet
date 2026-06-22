"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/app/components/ui/confirm-modal";
import {
    approveDriver,
    fetchAdminDriverById,
    rejectDriver,
    requestRevision,
    simulateClearBackgroundCheck,
    updateDriverRegionsAdmin,
} from "@/lib/drivers-api";
import { fetchActiveRegions, type Region } from "@/lib/regions-api";
import { withNgrokHeaders } from "@/lib/ngrok-headers";
import { mapApiDriver, type Driver } from "./driver-types";
import { StatusBadge, TierBadge } from "./driver-badges";
import { AdminDriverControls } from "./admin-driver-controls";
import { PhotoPreview } from "@/app/components/ui/photo-preview";
import { Upload, X } from "lucide-react";

type Props = {
    driver: Driver;
    onClose: () => void;
    onUpdate: (id: string, patch: Partial<Driver>) => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {children}
        </p>
    );
}

function InfoCell({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div className="rounded-xl border border-border/60 px-4 py-3">
            <p className="mb-0.5 text-[11px] uppercase tracking-wider text-muted">{label}</p>
            <p className={cn("text-sm font-medium text-text", valueClass)}>{value}</p>
        </div>
    );
}

function MissingBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
            {label}
        </span>
    );
}

// ── Upload For-Hire License Modal ────────────────────────────────
function UploadForHireLicenseModal({
    driverId,
    onClose,
    onUploaded,
}: {
    driverId: string;
    onClose: () => void;
    onUploaded: (patch: { forHireLicenseImage: string; hasForHireLicense: boolean }) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleSubmit() {
        if (!file) return toast.error("Please select an image file.");
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) return toast.error("Session expired.");

        const form = new FormData();
        form.append("forHireLicenseImage", file);

        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers/${driverId}/aleet-license`,
                { method: "POST", headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }), body: form },
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Upload failed");
            const d = json.data ?? {};
            toast.success("For-Hire License uploaded successfully!");
            onUploaded({
                forHireLicenseImage: d.forHireLicenseImage ?? d.driver?.forHireLicenseImage ?? "",
                hasForHireLicense: d.hasForHireLicense ?? d.driver?.hasForHireLicense ?? true,
            });
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-xl">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-text">Upload For-Hire License</h2>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drop zone */}
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
                        file
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border hover:border-gold/40 hover:bg-gold/5",
                    )}
                >
                    <Upload className={cn("h-7 w-7", file ? "text-emerald-400" : "text-muted")} />
                    <div className="text-center">
                        <p className={cn("text-sm font-medium", file ? "text-emerald-400" : "text-text")}>
                            {file ? file.name : "Click to select image"}
                        </p>
                        {!file && <p className="mt-0.5 text-xs text-muted">JPEG or PNG, max 10 MB</p>}
                    </div>
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />

                {/* Actions */}
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-text disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!file || loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-gold bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:border-gold/40 dark:bg-gold/15 dark:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        )}
                        Upload License
                    </button>
                </div>
            </div>
        </div>
    );
}

function checkrEventLabel(event: string | null): string {
    if (!event) return "—";
    return event.replace(/\./g, " › ").replace(/_/g, " ");
}

/**
 * DriverRegionsSection
 * ---------------------------------------------------------------------------
 * Admin's view + editor for which regions a driver is willing to serve.
 * Mirrors the driver-side picker but writes to the admin endpoint, so an
 * admin can correct or set a driver's regions during onboarding or when a
 * driver requests a change via support.
 *
 * Same default-open semantics as the driver-side picker.
 * ---------------------------------------------------------------------------
 */
function DriverRegionsSection({
    driver,
    onUpdate,
}: {
    driver: Driver;
    onUpdate: (id: string, patch: Partial<Driver>) => void;
}) {
    const [available, setAvailable] = useState<Region[]>([]);
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(driver.regions),
    );
    const [serveAll, setServeAll] = useState(driver.serveAllRegions);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchActiveRegions()
            .then((r) => {
                if (!cancelled) setAvailable(r);
            })
            .catch((err) => {
                if (!cancelled) {
                    toast.error(err instanceof Error ? err.message : "Failed to load regions");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Re-sync when the parent passes a different driver in
    useEffect(() => {
        setSelected(new Set(driver.regions));
        setServeAll(driver.serveAllRegions);
    }, [driver.id, driver.regions, driver.serveAllRegions]);

    function toggleRegion(id: string) {
        if (serveAll) return;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleSave() {
        if (!serveAll && selected.size === 0) {
            const ok = window.confirm(
                "No regions selected. This driver will be ineligible for any new trips. Continue?",
            );
            if (!ok) return;
        }
        setSaving(true);
        try {
            const body = serveAll
                ? { regions: [], serveAllRegions: true }
                : { regions: Array.from(selected), serveAllRegions: false };
            await updateDriverRegionsAdmin(driver.id, body);
            onUpdate(driver.id, {
                regions: body.regions,
                serveAllRegions: body.serveAllRegions,
            });
            toast.success(`Updated service regions for ${driver.name}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <SectionTitle>Service Regions</SectionTitle>

            {/* Master toggle */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-page-bg/40 p-4">
                <input
                    type="checkbox"
                    checked={serveAll}
                    onChange={(e) => setServeAll(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-gold"
                    disabled={loading}
                />
                <div className="flex-1">
                    <p className="text-sm font-medium text-text">Available in all regions</p>
                    <p className="mt-0.5 text-xs text-muted">
                        Driver will be eligible for bookings in every active region.
                    </p>
                </div>
            </label>

            {/* Restricted list */}
            <div className={`mt-4 ${serveAll ? "opacity-50" : ""}`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Or restrict to specific regions
                </p>
                {loading ? (
                    <p className="text-sm text-muted">Loading…</p>
                ) : available.length === 0 ? (
                    <p className="text-sm text-muted">No active regions configured.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {available.map((r) => (
                            <label
                                key={r._id}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl border border-border bg-page-bg/40 px-4 py-3",
                                    serveAll
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer hover:border-gold/40",
                                )}
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

            {/* Save row */}
            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                    {serveAll
                        ? "Driver is eligible everywhere."
                        : `Restricted to ${selected.size} region${selected.size === 1 ? "" : "s"}.`}
                </p>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold transition-colors hover:border-gold/70 hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving && (
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
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

export function DriverDetailModal({ driver, onClose, onUpdate }: Props) {
    const [step, setStep] = useState<"view" | "revision">("view");
    const [revisionNotes, setRevisionNotes] = useState("");
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRevising, setIsRevising] = useState(false);
    const [isSimulatingClear, setIsSimulatingClear] = useState(false);
    const [showUploadLicense, setShowUploadLicense] = useState(false);

    const missing: string[] = [];
    if (!driver.licenseImage) missing.push("Driver's license");
    if (!driver.ssn && !driver.hasForHireLicense) missing.push("SSN");
    if (driver.hasOwnVehicle && !driver.vehicleImage) missing.push("Vehicle photo");
    if (driver.hasForHireLicense && !driver.forHireLicenseImage) missing.push("For-hire license");

    const canApprove = ["submitted", "background_completed", "needs_revision", "revision_complete"].includes(driver.status);
    const statusOrder: Driver["status"][] = [
        "draft",
        "submitted",
        "background_pending",
        "background_in_review",
        "background_completed",
        "needs_revision",
        "revision_complete",
        "approved",
        "rejected",
    ];
    const canManuallyCompleteBackground =
        statusOrder.indexOf(driver.status) >= 0 &&
        statusOrder.indexOf(driver.status) < statusOrder.indexOf("background_completed");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Panel — scrollable */}
            <div className="relative z-10 flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card-bg shadow-[0_20px_60px_rgba(0,0,0,0.4)]">

                {/* Header */}
                <div className="flex shrink-0 items-center gap-4 border-b border-border px-6 py-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/20 text-base font-bold text-gold">
                        {driver.avatarUrl ? (
                            <Image
                                src={driver.avatarUrl}
                                alt={`${driver.name} avatar`}
                                width={48}
                                height={48}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            driver.avatar
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold text-text">{driver.name}</h2>
                        <p className="text-sm text-muted">{driver.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <StatusBadge status={driver.status} />
                        <TierBadge tier={driver.tier} />
                        <button onClick={onClose} aria-label="Close" className="text-muted hover:text-text transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                {step === "view" ? (
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* Missing fields */}
                        {missing.length > 0 && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                                <p className="mb-2 text-xs font-semibold text-red-400">Incomplete / Missing</p>
                                <div className="flex flex-wrap gap-2">
                                    {missing.map((m) => <MissingBadge key={m} label={m} />)}
                                </div>
                            </div>
                        )}

                        {/* Revision notes */}
                        {driver.revisionNotes && (
                            <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400">
                                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-amber-400">Revision Notes</p>
                                    <p className="mt-0.5 text-sm text-amber-400/80">{driver.revisionNotes}</p>
                                </div>
                            </div>
                        )}

                        <AdminDriverControls driver={driver} onUpdate={onUpdate} />

                        {/* Contact info */}
                        <div>
                            <SectionTitle>Contact Information</SectionTitle>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <InfoCell label="Full Name" value={driver.name} />
                                <InfoCell label="Phone" value={driver.phone} />
                                <InfoCell label="Email" value={driver.email} />
                                <InfoCell label="Joined" value={driver.joinedAt} />
                            </div>
                        </div>

                        {/* Onboarding status */}
                        <div>
                            <SectionTitle>Onboarding</SectionTitle>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <InfoCell label="Has Own Vehicle" value={driver.hasOwnVehicle ? "Yes" : "No"} />
                                <InfoCell
                                    label="For-Hire License"
                                    value={driver.hasForHireLicense ? "Own license" : "In progress"}
                                    valueClass={driver.hasForHireLicense ? "text-emerald-400" : "text-gold"}
                                />
                                <InfoCell
                                    label="SSN"
                                    value={driver.ssn && driver.ssn !== "null" ? driver.ssn : "—"}
                                />
                            </div>
                        </div>

                        {/* Background check */}
                        <div>
                            <SectionTitle>Background Check (Checkr)</SectionTitle>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <InfoCell
                                    label="Result"
                                    value={driver.backgroundCheck ? "✓ Passed" : "Not passed"}
                                    valueClass={driver.backgroundCheck ? "text-emerald-400" : "text-gold"}
                                />
                                <InfoCell label="Checkr Status" value={driver.checkrStatus ? driver.checkrStatus.charAt(0).toUpperCase() + driver.checkrStatus.slice(1) : "—"} />
                                <InfoCell label="Last Event" value={checkrEventLabel(driver.checkrLastEvent)} />
                                <InfoCell
                                    label="Last Update At"
                                    value={driver.checkrLastEventAt
                                        ? new Date(driver.checkrLastEventAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                        : "—"}
                                />
                            </div>
                            {(canManuallyCompleteBackground || driver.checkrDashboardUrl) && (
                                <div className="mt-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {canManuallyCompleteBackground && (
                                            <button
                                                onClick={async () => {
                                                    setIsSimulatingClear(true);
                                                    try {
                                                        await simulateClearBackgroundCheck(driver.id);
                                                        toast.success("Background check completed.");
                                                        try {
                                                            const refreshedDriver = await fetchAdminDriverById(driver.id);
                                                            onUpdate(driver.id, mapApiDriver(refreshedDriver));
                                                        } catch {
                                                            toast.warning("Background check updated, but failed to refresh driver data.");
                                                        }
                                                    } catch (e) {
                                                        toast.error(e instanceof Error ? e.message : "Failed to complete background check");
                                                    } finally {
                                                        setIsSimulatingClear(false);
                                                    }
                                                }}
                                                disabled={isSimulatingClear}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isSimulatingClear ? "Completing..." : "Complete Background Check Manually"}
                                            </button>
                                        )}
                                        {driver.checkrDashboardUrl && (
                                            <a
                                                href={driver.checkrDashboardUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:border-gold hover:bg-gold/10"
                                            >
                                                Open in Checkr Dashboard
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                    {canManuallyCompleteBackground && (
                                        <p className="mt-2 text-xs text-gold/80">
                                            Test action: use only for local/staging verification.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Documents */}
                        <div>
                            <SectionTitle>Uploaded Documents</SectionTitle>
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                                <PhotoPreview url={driver.licenseImage} label="Driver's License" />
                                {driver.vehicleImage && (
                                    <PhotoPreview url={driver.vehicleImage} label="Vehicle Photo" />
                                )}
                                {driver.forHireLicenseImage && (
                                    <PhotoPreview url={driver.forHireLicenseImage} label="For-Hire License" />
                                )}
                            </div>
                            {!driver.hasForHireLicense && !driver.forHireLicenseImage && (
                                <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
                                    <p className="text-xs text-gold/80">
                                        For-Hire License: <span className="font-semibold text-gold">In Progress</span> — will be handled by the platform.
                                    </p>
                                    <button
                                        onClick={() => setShowUploadLicense(true)}
                                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload License
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Vehicle info */}
                        {(driver.hasOwnVehicle || driver.vehicleImage || driver.vehicleTypes.length > 0) && (
                            <div>
                                <SectionTitle>Vehicle Information</SectionTitle>
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoCell label="Vehicle Types" value={driver.vehicleTypes.length > 0 ? driver.vehicleTypes.join(", ") : "—"} />
                                    <InfoCell label="Rating" value={driver.rating > 0 ? `⭐ ${driver.rating}` : "—"} />
                                </div>
                            </div>
                        )}

                        {/* Service regions — admin edit */}
                        <DriverRegionsSection driver={driver} onUpdate={onUpdate} />

                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        <p className="mb-1 text-base font-semibold text-text">Request Revision</p>
                        <p className="mb-5 text-sm text-muted">
                            Describe what the driver needs to fix or re-submit. They will see this message in their app.
                        </p>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                            Message to driver
                        </label>
                        <textarea
                            value={revisionNotes}
                            onChange={(e) => setRevisionNotes(e.target.value)}
                            placeholder="e.g. Your license photo is blurry — please re-upload a clear image."
                            rows={5}
                            className="w-full resize-none rounded-xl border border-border bg-page-bg px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:border-amber-500/50 focus:outline-none"
                        />
                        <p className="mt-1.5 text-right text-xs text-muted">{revisionNotes.length} chars</p>
                    </div>
                )}

                {/* Footer actions */}
                {canApprove && (
                    <div className="shrink-0 border-t border-border px-6 py-4">
                        {step === "view" ? (
                            <div className="flex gap-3">
                                {/* Approve — emerald */}
                                <button
                                    onClick={() => setShowApproveConfirm(true)}
                                    className="inline-flex h-11.5 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm font-semibold uppercase tracking-wide text-emerald-400 transition-colors hover:border-emerald-500/70 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Approve
                                </button>
                                {/* Request Revision — amber */}
                                <button
                                    onClick={() => setStep("revision")}
                                    className="inline-flex h-11.5 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-semibold uppercase tracking-wide text-amber-400 transition-colors hover:border-amber-500/70 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Revision
                                </button>
                                {/* Reject — red */}
                                <button
                                    onClick={() => setShowRejectConfirm(true)}
                                    className="inline-flex h-11.5 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold uppercase tracking-wide text-red-400 transition-colors hover:border-red-500/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <path d="M18 6 6 18M6 6l12 12" />
                                    </svg>
                                    Reject
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setStep("view"); setRevisionNotes(""); }}
                                    className="inline-flex h-11.5 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:border-gold/40 hover:text-text"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    disabled={isRevising || revisionNotes.trim().length === 0}
                                    onClick={async () => {
                                        setIsRevising(true);
                                        try {
                                            await requestRevision(driver.id, revisionNotes.trim());
                                            onUpdate(driver.id, { status: "needs_revision" });
                                            toast.success(`Revision requested from ${driver.name}.`);
                                            onClose();
                                        } catch (e) {
                                            toast.error(e instanceof Error ? e.message : "Failed to request revision");
                                        } finally {
                                            setIsRevising(false);
                                        }
                                    }}
                                    className="inline-flex h-11.5 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-semibold uppercase tracking-wide text-amber-400 transition-colors hover:border-amber-500/70 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isRevising ? (
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                    )}
                                    Send Request
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Approve confirm */}
            {showApproveConfirm && (
                <ConfirmModal
                    title={`Approve ${driver.name}?`}
                    description="This will grant the driver full access to the platform. Make sure documents and background check have been reviewed."
                    confirmLabel="Approve"
                    variant="success"
                    isLoading={isApproving}
                    onCancel={() => setShowApproveConfirm(false)}
                    onConfirm={async () => {
                        setIsApproving(true);
                        try {
                            await approveDriver(driver.id);
                            onUpdate(driver.id, { status: "approved" });
                            toast.success(`${driver.name} has been approved.`);
                            setShowApproveConfirm(false);
                            onClose();
                        } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to approve driver");
                        } finally {
                            setIsApproving(false);
                        }
                    }}
                />
            )}

            {/* Reject confirm */}
            {showRejectConfirm && (
                <ConfirmModal
                    title={`Reject ${driver.name}?`}
                    description="This will permanently reject the driver's application. They will be notified and will not be able to access the platform."
                    confirmLabel="Reject"
                    variant="danger"
                    isLoading={isRejecting}
                    onCancel={() => setShowRejectConfirm(false)}
                    onConfirm={async () => {
                        setIsRejecting(true);
                        try {
                            await rejectDriver(driver.id);
                            onUpdate(driver.id, { status: "rejected" });
                            toast.success(`${driver.name} has been rejected.`);
                            setShowRejectConfirm(false);
                            onClose();
                        } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to reject driver");
                        } finally {
                            setIsRejecting(false);
                        }
                    }}
                />
            )}

            {/* Upload For-Hire License modal */}
            {showUploadLicense && (
                <UploadForHireLicenseModal
                    driverId={driver.id}
                    onClose={() => setShowUploadLicense(false)}
                    onUploaded={(patch) => onUpdate(driver.id, patch)}
                />
            )}
        </div>
    );
}


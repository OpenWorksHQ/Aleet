"use client";

import { useState, useRef, useEffect } from "react";
import {
    FileText, Camera, Car, ShieldCheck,
    CheckCircle2, Upload, Check, AlertCircle, CreditCard, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/user-store";
import { withNgrokHeaders } from "@/lib/ngrok-headers";

// ── Progress Overview ─────────────────────────────────────────────
const ALL_STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: "ssn", label: "SSN", icon: <CreditCard className="h-3 w-3" /> },
    { key: "license", label: "License", icon: <FileText className="h-3 w-3" /> },
    { key: "vehicle", label: "Car Photo", icon: <Car className="h-3 w-3" /> },
    { key: "forHire", label: "For-Hire", icon: <FileText className="h-3 w-3" /> },
    { key: "background", label: "Background", icon: <ShieldCheck className="h-3 w-3" /> },
];

function ProgressOverview({ steps, doneFlags }: { steps: typeof ALL_STEPS; doneFlags: boolean[] }) {
    const doneCount = doneFlags.filter(Boolean).length;
    const pct = Math.round((doneCount / doneFlags.length) * 100);

    const sorted = steps.map((s, i) => ({ ...s, done: doneFlags[i] }))
        .sort((a, b) => Number(b.done) - Number(a.done));

    return (
        <div className="space-y-4">
            {/* Bar + label */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gold transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <span className="shrink-0 text-xs font-medium text-muted">
                    {doneCount} / {doneFlags.length} steps
                </span>
            </div>

            {/* Step chips — done first */}
            <div className="flex flex-wrap gap-2">
                {sorted.map((s) => (
                    <div
                        key={s.label}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            s.done
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-border bg-page-bg text-muted"
                        )}
                    >
                        {s.icon}
                        <span>{s.label}</span>
                        {s.done && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── File Picker ───────────────────────────────────────────────────
function FilePicker({ label, hint, file, existingUrl, onChange }: {
    label: string; hint?: string; file: File | null; existingUrl?: string | null; onChange: (f: File | null) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const hasExisting = !file && !!existingUrl;
    const isDone = !!file || hasExisting;
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">{label}</span>
            <button
                type="button"
                onClick={() => ref.current?.click()}
                className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                    isDone
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                        : "border-dashed border-border text-muted hover:border-gold/40 hover:bg-gold/5 hover:text-text"
                )}
            >
                <div className="flex items-center gap-2.5">
                    {isDone ? <Check className="h-4 w-4 shrink-0" /> : <Upload className="h-4 w-4 shrink-0" />}
                    <span className="truncate max-w-xs">
                        {file ? file.name : hasExisting ? "Uploaded — click to replace" : "Choose file to upload"}
                    </span>
                </div>
                <span className="shrink-0 text-xs text-muted">Max 10MB</span>
            </button>
            {hasExisting && (
                <a
                    href={existingUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:underline"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {label}
                </a>
            )}
            {hint && <p className="text-[11px] text-muted">{hint}</p>}
            <input ref={ref} type="file" accept="image/jpeg,image/png" className="hidden"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </div>
    );
}

// ── Section Card ──────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, done, children }: {
    icon: React.ReactNode; title: string; subtitle: string; done: boolean; children: React.ReactNode;
}) {
    return (
        <div className={cn(
            "rounded-2xl border bg-card-bg",
            done ? "border-emerald-500/20" : "border-border"
        )}>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-text leading-none">{title}</p>
                        <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
                    </div>
                </div>
                {done && (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                )}
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

// ── Submit Revision Modal ────────────────────────────────────────
function SubmitRevisionModal({ open, onClose, onConfirm, loading }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-xl">
                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-400">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-semibold text-text">Submit for Review?</h2>
                        <p className="mt-1 text-sm text-muted">
                            Your updated profile will be sent to the admin team for review.
                            Revision notes will be cleared once submitted.
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-border/60 hover:text-text disabled:opacity-50"
                    >
                        Not Yet
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        )}
                        Submit for Review
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────
function Bone({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-lg bg-border/50", className)} />;
}

function SectionCardSkeleton({ rows = 1 }: { rows?: number }) {
    return (
        <div className="rounded-2xl border border-border bg-card-bg">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
                <Bone className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                    <Bone className="h-3.5 w-36" />
                    <Bone className="h-3 w-52" />
                </div>
            </div>
            <div className="px-5 py-4 space-y-2.5">
                {Array.from({ length: rows }).map((_, i) => (
                    <Bone key={i} className="h-10 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}

function OnboardingFormSkeleton() {
    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Bone className="h-7 w-56" />
                    <Bone className="h-4 w-72" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Bone className="h-7 w-24 rounded-full" />
                    <Bone className="h-9 w-36 rounded-xl" />
                </div>
            </div>

            {/* Progress */}
            <div className="rounded-2xl border border-border bg-card-bg px-6 py-5 space-y-4">
                <div className="flex items-center gap-3">
                    <Bone className="flex-1 h-2 rounded-full" />
                    <Bone className="h-3.5 w-20 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {[80, 72, 64, 80, 72].map((w, i) => (
                        <Bone key={i} className={`h-7 w-${w === 80 ? "20" : w === 72 ? "[72px]" : "16"} rounded-full`} />
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCardSkeleton rows={2} />
                <SectionCardSkeleton rows={1} />
                <SectionCardSkeleton rows={2} />
                <SectionCardSkeleton rows={2} />
                <SectionCardSkeleton rows={3} />
            </div>
        </div>
    );
}

// ── Main Form ─────────────────────────────────────────────────────
export function OnboardingForm() {
    const profile = useUserStore((s) => s.profile);
    const isLoading = useUserStore((s) => s.isLoading);
    const driverStatus = profile?.driverStatus ?? "";
    const revisionNotes = profile?.revisionNotes ?? null;

    const [ssn, setSsn] = useState("");
    const [editingSsn, setEditingSsn] = useState(false);
    const [licenseImage, setLicenseImage] = useState<File | null>(null);
    const [vehicleImage, setVehicleImage] = useState<File | null>(null);
    const [hasForHireLicense, setHasForHireLicense] = useState<"yes" | "no">(
        profile?.hasForHireLicense ? "yes" : "no"
    );
    const profileHasForHireLicense = profile?.hasForHireLicense;
    const [forHireLicenseImage, setForHireLicenseImage] = useState<File | null>(null);
    const [authorized, setAuthorized] = useState(!profile?.hasForHireLicense && !!profile?.forHireLicenseImage === false);

    // Sync hasForHireLicense when profile loads from store (profile may be null on first render)
    useEffect(() => {
        if (typeof profileHasForHireLicense === "boolean") {
            setHasForHireLicense(profileHasForHireLicense ? "yes" : "no");
        }
    }, [profileHasForHireLicense]);
    const [loading, setLoading] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const ssnDone = ssn.length === 11 || !!profile?.ssn;
    const licenseDone = !!licenseImage || !!profile?.licenseImage;
    const vehicleDone = !!vehicleImage || !!profile?.vehicleImage;
    const forHireDone = hasForHireLicense === "yes"
        ? !!forHireLicenseImage || !!profile?.forHireLicenseImage
        : authorized;
    const bgCheckDone = profile?.backgroundCheck ?? false;

    const hasOwnVehicle = profile?.hasOwnVehicle ?? true;
    const steps = ALL_STEPS.filter((s) => {
        if (s.key === "ssn" && hasForHireLicense === "yes") return false;
        if (s.key === "vehicle" && !hasOwnVehicle) return false;
        return true;
    });
    const doneFlags = steps.map((s) => {
        if (s.key === "ssn") return ssn.length === 11 || !!profile?.ssn;
        if (s.key === "license") return licenseDone;
        if (s.key === "vehicle") return vehicleDone;
        if (s.key === "forHire") return forHireDone;
        if (s.key === "background") return bgCheckDone;
        return false;
    });
    const doneCount = doneFlags.filter(Boolean).length;
    const pct = Math.round((doneCount / (doneFlags.length || 1)) * 100);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (hasForHireLicense !== "yes" && !ssnDone) return toast.error("Please enter your SSN.");
        if (hasOwnVehicle && !vehicleDone) return toast.error("Vehicle image is required.");
        if (hasForHireLicense === "no" && !authorized)
            return toast.error("Please authorize the For-Hire License processing.");
        if (hasForHireLicense === "yes" && !forHireLicenseImage && !profile?.forHireLicenseImage)
            return toast.error("Please upload your For-Hire License image.");

        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) return toast.error("Session expired. Please log in again.");

        const form = new FormData();

        if (ssn && editingSsn) form.append("ssn", ssn);
        if (licenseImage) form.append("licenseImage", licenseImage);
        if (vehicleImage) form.append("vehicleImage", vehicleImage);
        if (forHireLicenseImage) form.append("forHireLicenseImage", forHireLicenseImage);
        form.append("hasForHireLicense", String(hasForHireLicense === "yes"));

        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/update-profile`, {
                method: "PUT",
                headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
                body: form,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Update failed");

            // update store with fresh data from response
            const d = json.data?.driver;
            if (d) {
                useUserStore.getState().setProfile({
                    ...useUserStore.getState().profile!,
                    driverStatus: d.status ?? "",
                    revisionNotes: d.revisionNotes ?? null,
                    ssn: d.ssn ?? null,
                    licenseImage: d.licenseImage ?? null,
                    vehicleImage: d.vehicleImage ?? null,
                    forHireLicenseImage: d.forHireLicenseImage ?? null,
                    hasForHireLicense: d.hasForHireLicense ?? false,
                    backgroundCheck: d.backgroundCheck ?? false,
                });
            }

            setSsn("");
            setEditingSsn(false);
            setLicenseImage(null);
            setVehicleImage(null);
            setForHireLicenseImage(null);
            toast.success("Profile updated successfully!");

            if (d?.status === "needs_revision") {
                setShowRevisionModal(true);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitRevision() {
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) return toast.error("Session expired. Please log in again.");

        setSubmitLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/submit-revision`, {
                method: "POST",
                headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Submission failed");

            const d = json.data?.driver;
            if (d) {
                useUserStore.getState().setProfile({
                    ...useUserStore.getState().profile!,
                    driverStatus: d.status ?? "",
                    revisionNotes: d.revisionNotes ?? null,
                });
            }
            setShowRevisionModal(false);
            toast.success("Profile submitted for review!");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitLoading(false);
        }
    }

    if (isLoading) return <OnboardingFormSkeleton />;

    return (
        <>
            <SubmitRevisionModal
                open={showRevisionModal}
                onClose={() => setShowRevisionModal(false)}
                onConfirm={handleSubmitRevision}
                loading={submitLoading}
            />
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Revision warning banner */}
                {driverStatus === "needs_revision" && revisionNotes && (
                    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <div>
                            <p className="text-sm font-medium text-amber-400">Revision Required</p>
                            <p className="mt-0.5 text-sm text-amber-400/80">{revisionNotes}</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text">Driver Onboarding</h1>
                        <p className="mt-0.5 text-sm text-muted">Complete your profile to start accepting trips</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium",
                            pct === 100
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-gold/30 bg-gold/10 text-gold"
                        )}>
                            {pct}% Complete
                        </span>
                        {driverStatus === "needs_revision" && (
                            <button
                                type="button"
                                onClick={() => setShowRevisionModal(true)}
                                disabled={submitLoading}
                                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Submit for Review
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading || driverStatus === "revision_complete"}
                            title={driverStatus === "revision_complete" ? "Your profile is under review" : undefined}
                            className="inline-flex items-center gap-2 rounded-xl border border-gold bg-gold px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:border-gold/40 dark:bg-gold/15 dark:text-gold dark:hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-60"
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

                {/* Progress */}
                <div className="rounded-2xl border border-border bg-card-bg px-6 py-5">
                    <ProgressOverview steps={steps} doneFlags={doneFlags} />
                </div>

                {/* Grid 2-col */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                    {/* SSN — hidden when driver has For-Hire License */}
                    {hasForHireLicense !== "yes" && (
                        <SectionCard icon={<FileText className="h-4 w-4" />} title="Social Security Number"
                            subtitle="Enter your SSN for verification purposes" done={ssnDone}>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text">SSN</label>
                                {profile?.ssn && !editingSsn ? (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={profile.ssn}
                                            readOnly
                                            className="h-10 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 pr-10 text-sm text-emerald-600 dark:text-emerald-400 outline-none cursor-default"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setEditingSsn(true)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/60 hover:text-emerald-500 transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="123-45-6789"
                                        value={ssn}
                                        onChange={(e) => {
                                            const d = e.target.value.replace(/\D/g, "").slice(0, 9);
                                            let f = d;
                                            if (d.length > 5) f = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
                                            else if (d.length > 3) f = `${d.slice(0, 3)}-${d.slice(3)}`;
                                            setSsn(f);
                                        }}
                                        className="h-10 w-full rounded-xl border border-border bg-page-bg px-3.5 text-sm text-text outline-none placeholder:text-muted focus:border-gold/50 transition-colors"
                                    />
                                )}
                                <p className="text-[11px] text-muted">Format: XXX-XX-XXXX</p>
                            </div>
                        </SectionCard>
                    )}

                    {/* Background Check */}
                    <SectionCard icon={<ShieldCheck className="h-4 w-4" />} title="Background Check"
                        subtitle="Your background check status" done={bgCheckDone}>
                        <div className="flex items-center gap-3">
                            {bgCheckDone ? (
                                <span className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Background Check Completed
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 text-sm font-medium text-amber-400">
                                    <AlertCircle className="h-4 w-4" />
                                    Background Check Pending
                                </span>
                            )}
                            <p className="text-xs text-muted">
                                {bgCheckDone ? "Completed successfully." : "We'll notify you once it's done."}
                            </p>
                        </div>
                    </SectionCard>

                    {/* Driver's License */}
                    <SectionCard icon={<Camera className="h-4 w-4" />} title="Driver's License"
                        subtitle="Upload a clear photo of your driver's license" done={licenseDone}>
                        <FilePicker label="License Image"
                            hint="Supported formats: JPEG, PNG"
                            file={licenseImage}
                            existingUrl={profile?.licenseImage}
                            onChange={setLicenseImage} />
                    </SectionCard>

                    {/* Vehicle Image — only when driver has own vehicle */}
                    {hasOwnVehicle && (
                        <SectionCard icon={<Car className="h-4 w-4" />} title="Car Photo"
                            subtitle="Upload a clear photo of your own car" done={vehicleDone}>
                            <FilePicker label="Car Photo"
                                hint="Supported formats: JPEG, PNG"
                                file={vehicleImage}
                                existingUrl={profile?.vehicleImage}
                                onChange={setVehicleImage} />
                        </SectionCard>
                    )}

                    {/* For-Hire License */}
                    <SectionCard icon={<FileText className="h-4 w-4" />} title="For-Hire License Verification"
                        subtitle="Verify your For-Hire License status" done={forHireDone}>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-text">
                                    Do you have a For-Hire License? <span className="text-gold">*</span>
                                </label>
                                <div className="relative mt-2">
                                    <select
                                        value={hasForHireLicense}
                                        onChange={(e) => setHasForHireLicense(e.target.value as "yes" | "no")}
                                        className="h-10 w-full appearance-none rounded-xl border border-border bg-page-bg px-3.5 pr-8 text-sm text-text outline-none focus:border-gold/50 transition-colors"
                                    >
                                        <option value="no">No, I don&apos;t have a For-Hire License</option>
                                        <option value="yes">Yes, I have a For-Hire License</option>
                                    </select>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </div>

                            {hasForHireLicense === "no" && (
                                <div className="space-y-3">
                                    <div className="flex gap-3 rounded-xl border border-gold/20 bg-gold/5 p-3.5 text-sm">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                                        <div>
                                            <p className="font-medium text-gold">Swift Haven will process your For-Hire License for you.</p>
                                            <p className="mt-0.5 text-xs text-gold/70">The cost will be deducted from your future earnings.</p>
                                        </div>
                                    </div>
                                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-text">
                                        <input type="checkbox" checked={authorized}
                                            onChange={(e) => setAuthorized(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 accent-gold" />
                                        I authorize Swift Haven to apply for my For-Hire License and deduct the cost from my earnings.
                                    </label>
                                </div>
                            )}

                            {hasForHireLicense === "yes" && (
                                <FilePicker label="For-Hire License Image"
                                    hint="Supported formats: JPEG, PNG"
                                    file={forHireLicenseImage}
                                    existingUrl={profile?.forHireLicenseImage}
                                    onChange={setForHireLicenseImage} />
                            )}
                        </div>
                    </SectionCard>

                </div>
            </form>
        </>
    );
}

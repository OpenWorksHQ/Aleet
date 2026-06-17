"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Input, PhoneInput, TextLink } from "../ui";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
    fetchVehicleTypes,
    signupComplete,
    signupDocuments,
    signupStart,
    VehicleType,
} from "@/lib/signup-api";
import { validateSSN } from "@/lib/validators/ssn";
import { Stepper } from "./signup/stepper";
import { FileUploadArea } from "./signup/file-upload-area";
import { NativeSelect } from "./signup/native-select";
import { Field } from "./signup/field";
import { NavButtons } from "./signup/nav-buttons";

// Steps: 0=Basic Info, 1=About You, 2=Documents
// (No SMS/OTP step — drivers verify via document review + Checkr.)
const STEP_BASIC = 0;
const STEP_ROUTING = 1;
const STEP_DOCS = 2;

export default function SignupForm() {
    const [step, setStep] = useState(STEP_BASIC);
    const [loading, setLoading] = useState(false);

    // Step 0 — Basic Info
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);

    // Step 1 — Routing questions
    const [hasOwnVehicle, setHasOwnVehicle] = useState<"yes" | "no" | "">("");
    const [hasForHireLicense, setHasForHireLicense] = useState<"yes" | "no" | "">("");

    // Step 2 — Documents (conditional)
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    const [vehicleTypeId, setVehicleTypeId] = useState("");
    const [licenseImage, setLicenseImage] = useState<File | null>(null);
    const [vehicleImage, setVehicleImage] = useState<File | null>(null);
    const [forHireLicenseImage, setForHireLicenseImage] = useState<File | null>(null);
    const [ssn, setSsn] = useState("");
    const [ssnError, setSsnError] = useState<string | null>(null);
    const [authorized, setAuthorized] = useState(false);

    // driverToken: returned by /signup/start (type: driver_signup_verified, 30 min)
    // docsToken:   returned by /signup/documents
    const [driverToken, setDriverToken] = useState("");

    const err = (msg: string) => { toast.error(msg); setLoading(false); };

    useEffect(() => {
        if (step === STEP_DOCS && hasOwnVehicle === "yes" && vehicleTypes.length === 0) {
            fetchVehicleTypes().then(setVehicleTypes).catch(() => { });
        }
    }, [step, hasOwnVehicle, vehicleTypes.length]);

    async function handleBasicNext() {
        if (!name.trim()) return err("Full name is required.");
        if (!email.trim()) return err("Email is required.");
        if (!phone) return err("Phone number is required.");
        if (password.length < 6) return err("Password must be at least 6 characters.");
        setLoading(true);
        try {
            const { driverToken: token } = await signupStart({ name, phone, email, password });
            setDriverToken(token);
            setStep(STEP_ROUTING);
        } catch (e) {
            err(e instanceof Error ? e.message : "Signup failed");
        } finally {
            setLoading(false);
        }
    }

    function handleRoutingNext() {
        if (!hasOwnVehicle) return err("Please answer whether you have your own vehicle.");
        if (!hasForHireLicense) return err("Please answer whether you have a for-hire license.");
        setStep(STEP_DOCS);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Driver's license always required
        if (!licenseImage) return err("Driver license image is required.");

        // Vehicle fields only if they have own vehicle
        if (hasOwnVehicle === "yes") {
            if (!vehicleTypeId) return err("Please select a vehicle type.");
        }

        // For-hire license image only if they already have one
        if (hasForHireLicense === "yes" && !forHireLicenseImage) {
            return err("Please upload your for-hire license image.");
        }

        // SSN only if Swift Haven will process for them
        if (hasForHireLicense === "no") {
            const v = validateSSN(ssn);
            if (!v.valid) {
                setSsnError(v.error);
                return err(v.error);
            }
            setSsnError(null);
        }
        if (hasForHireLicense === "no" && !authorized) {
            return err("Please authorize Swift Haven to process your For-Hire License.");
        }

        if (!driverToken) return err("Signup session expired. Please go back and start again.");

        setLoading(true);
        try {
            const docsTokenResult = await signupDocuments({
                driverToken,
                hasForHireLicense: hasForHireLicense === "yes",
                hasOwnVehicle: hasOwnVehicle === "yes",
                licenseImage: licenseImage!,
                ssn: hasForHireLicense === "no" ? ssn : undefined,
                vehicleTypes: hasOwnVehicle === "yes" && vehicleTypeId ? [vehicleTypeId] : undefined,
                vehicleImage: hasOwnVehicle === "yes" ? vehicleImage : null,
                forHireLicenseImage: hasForHireLicense === "yes" ? forHireLicenseImage : null,
            });

            const { token, user } = await signupComplete({
                docsToken: docsTokenResult,
                authorizeBackgroundCheck: hasForHireLicense === "no" ? authorized : false,
            });

            const driverStatus = user.driver?.status ?? "pending_review";
            const cookieOpts = "path=/; max-age=604800; SameSite=Lax";
            document.cookie = `auth_token=${token}; ${cookieOpts}`;
            document.cookie = `auth_role=driver; ${cookieOpts}`;
            document.cookie = `driver_status=${driverStatus}; ${cookieOpts}`;
            window.location.href = "/pending";
        } catch (e) {
            err(e instanceof Error ? e.message : "Account creation failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-page-bg">
            <main className="flex flex-1 items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl rounded-3xl border border-border bg-card-bg px-6 py-10 shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.35)] sm:px-12">

                    {/* Logo */}
                    <div className="mb-5 flex justify-center">
                        <Image src="/logo.png" alt="Aleet" width={56} height={56} className="h-22 w-22 object-contain" />
                    </div>

                    <p className="mb-6 text-center text-sm text-muted">
                        Create your account to start your journey
                    </p>

                    <Stepper current={step} />

                    <form onSubmit={handleSubmit} noValidate>

                        {/* ── Step 0: Basic Info ── */}
                        {step === STEP_BASIC && (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-text text-center">Basic Information</h2>
                                    <p className="mt-1 text-center text-sm text-muted">Let&apos;s start with your personal details</p>
                                </div>
                                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Full Name" required>
                                        <Input placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
                                    </Field>
                                    <Field label="Email Address" required>
                                        <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </Field>
                                    <Field label="Phone Number" required>
                                        <PhoneInput value={phone} onChange={setPhone} className="phone-input-wrapper" />
                                    </Field>
                                    <Field label="Password" required>
                                        <div className="relative">
                                            <Input
                                                type={showPass ? "text" : "password"}
                                                placeholder="Min 6 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pr-11"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowPass((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                                            >
                                                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </Field>
                                </div>
                                <NavButtons hideBack onNext={handleBasicNext} loading={loading} />
                            </div>
                        )}

                        {/* ── Step 1: Routing Questions ── */}
                        {step === STEP_ROUTING && (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-text text-center">About You</h2>
                                    <p className="mt-1 text-center text-sm text-muted">Help us prepare the right documents for you</p>
                                </div>
                                <div className="mt-2 flex flex-col gap-4">
                                    <Field label="Do you have your own vehicle?" required>
                                        <NativeSelect
                                            value={hasOwnVehicle}
                                            onChange={(v) => setHasOwnVehicle(v as "yes" | "no")}
                                            placeholder="Select an option"
                                            options={[
                                                { value: "yes", label: "Yes, I have my own vehicle" },
                                                { value: "no", label: "No, I don't have my own vehicle" },
                                            ]}
                                        />
                                    </Field>
                                    <Field label="Do you already have a For-Hire License?" required>
                                        <NativeSelect
                                            value={hasForHireLicense}
                                            onChange={(v) => setHasForHireLicense(v as "yes" | "no")}
                                            placeholder="Select an option"
                                            options={[
                                                { value: "yes", label: "Yes, I already have a For-Hire License" },
                                                { value: "no", label: "No, I need one processed" },
                                            ]}
                                        />
                                        {hasForHireLicense === "no" && (
                                            <p className="mt-1.5 text-xs text-gold/80">
                                                Swift Haven will process your For-Hire License. The cost will be deducted from your future earnings.
                                            </p>
                                        )}
                                    </Field>
                                </div>
                                <NavButtons onBack={() => setStep(STEP_BASIC)} onNext={handleRoutingNext} loading={loading} />
                            </div>
                        )}

                        {/* ── Step 2: Documents (conditional) ── */}
                        {step === STEP_DOCS && (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-text text-center">Required Documents</h2>
                                    <p className="mt-1 text-center text-sm text-muted">Upload the documents that apply to you</p>
                                </div>
                                <div className="mt-1 flex flex-col gap-4">

                                    {/* Driver's license — always required */}
                                    <div>
                                        <FileUploadArea
                                            label="Driver License Image"
                                            hint="Upload a clear photo of your driver's license"
                                            file={licenseImage}
                                            onChange={setLicenseImage}
                                            required
                                        />
                                    </div>

                                    {/* Vehicle section — only if own vehicle */}
                                    {hasOwnVehicle === "yes" && (
                                        <div className="flex flex-col gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your Vehicle</p>
                                            <Field label="Vehicle Type" required>
                                                {vehicleTypes.length === 0 ? (
                                                    <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold">
                                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                                        No vehicle types available. Please contact support.
                                                    </div>
                                                ) : (
                                                    <NativeSelect
                                                        value={vehicleTypeId}
                                                        onChange={setVehicleTypeId}
                                                        placeholder="Select your vehicle type"
                                                        options={vehicleTypes.map((vt) => ({
                                                            value: vt._id,
                                                            label: vt.name,
                                                        }))}
                                                    />
                                                )}
                                            </Field>
                                            <FileUploadArea
                                                label="Vehicle Image"
                                                hint="Upload a clear photo of your vehicle"
                                                file={vehicleImage}
                                                onChange={setVehicleImage}
                                            />
                                        </div>
                                    )}

                                    {/* For-hire license — only if they already have one */}
                                    {hasForHireLicense === "yes" && (
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">For-Hire License</p>
                                            <FileUploadArea
                                                label="For-Hire License Image"
                                                hint="Upload a clear photo of your for-hire license"
                                                file={forHireLicenseImage}
                                                onChange={setForHireLicenseImage}
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* SSN — only if Swift Haven will process the license */}
                                    {hasForHireLicense === "no" && (
                                        <div className="flex flex-col gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">License Processing</p>
                                            <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold">
                                                <p className="font-medium">Swift Haven will process your For-Hire License.</p>
                                                <p className="mt-0.5 text-xs text-gold/80">
                                                    Your SSN is required to submit the for-hire license application on your behalf. The processing cost will be deducted from your future earnings.
                                                </p>
                                                <p className="mt-2 text-xs text-gold/60">
                                                    Note: Your background check is handled separately by <span className="font-medium text-gold/80">Checkr</span> — you&apos;ll receive an email from them after signup to complete that step independently.
                                                </p>
                                            </div>
                                            <Field label="Social Security Number" required>
                                                <Input
                                                    placeholder="123-45-6789"
                                                    value={ssn}
                                                    type="password"
                                                    onChange={(e) => {
                                                        const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                                                        let formatted = digits;
                                                        if (digits.length > 5) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
                                                        else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                                                        setSsn(formatted);
                                                        if (ssnError) setSsnError(null);
                                                    }}
                                                    onBlur={() => {
                                                        if (!ssn) return; // don't nag on empty until submit
                                                        const v = validateSSN(ssn);
                                                        setSsnError(v.valid ? null : v.error);
                                                    }}
                                                />
                                                {ssnError ? (
                                                    <p className="text-[11px] text-red-500">{ssnError}</p>
                                                ) : (
                                                    <p className="text-[11px] text-muted">Format: XXX-XX-XXXX</p>
                                                )}
                                            </Field>
                                            <label className="flex cursor-pointer items-start gap-3 text-sm text-text">
                                                <input
                                                    type="checkbox"
                                                    checked={authorized}
                                                    onChange={(e) => setAuthorized(e.target.checked)}
                                                    className="mt-0.5 h-4 w-4 accent-gold"
                                                />
                                                I authorize Swift Haven to apply for my For-Hire License and deduct the cost from my earnings.
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <NavButtons
                                    onBack={() => setStep(STEP_ROUTING)}
                                    nextLabel="Create Account"
                                    loading={loading}
                                />
                            </div>
                        )}

                    </form>

                    <p className="mt-6 text-center text-sm text-muted">
                        Already have an account?{" "}
                        <TextLink href="/login" className="text-gold">
                            Sign in here
                        </TextLink>
                    </p>
                </div>
            </main>
        </div>
    );
}

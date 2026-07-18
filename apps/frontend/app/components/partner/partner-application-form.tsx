"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Input, toast, AddressAutocomplete } from "@/app/components/ui";
import {
  checkPartnerApplicationEmail,
  submitPartnerApplication,
} from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import { normalizeWebsiteUrl } from "@/lib/normalize-website";
import {
  getPartnerFieldError,
  PartnerContactEmailError,
} from "@/app/components/partner/partner-contact-email-error";
import { PartnerDashboardNavButton } from "@/app/components/partner/partner-dashboard-nav-button";

export function PartnerApplicationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [contactEmailDetail, setContactEmailDetail] = useState<
    ReturnType<typeof getPartnerFieldError>
  >(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPlaceId, setBusinessPlaceId] = useState("");
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyContactEmailError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      const detail = getPartnerFieldError(err.errors, "contactEmail");
      if (detail || err.message.toLowerCase().includes("email")) {
        setContactEmailError(err.message);
        setContactEmailDetail(detail);
        return true;
      }
    }
    return false;
  }, []);

  const validateContactEmail = useCallback(async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      setContactEmailError(null);
      setContactEmailDetail(null);
      return true;
    }

    setCheckingEmail(true);
    try {
      await checkPartnerApplicationEmail(trimmed);
      setContactEmailError(null);
      setContactEmailDetail(null);
      return true;
    } catch (err) {
      applyContactEmailError(err);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  }, [applyContactEmailError]);

  useEffect(() => {
    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    };
  }, []);

  function scheduleEmailCheck(email: string) {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    setContactEmailError(null);
    setContactEmailDetail(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;

    emailCheckTimer.current = setTimeout(() => {
      void validateContactEmail(trimmed);
    }, 500);
  }

  function handleContactEmailChange(value: string) {
    setContactEmail(value);
    setFormError(null);
    scheduleEmailCheck(value);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const email = contactEmail.trim();

    if (!email) {
      setContactEmailError("Contact email is required.");
      setContactEmailDetail({ code: "required" });
      return;
    }

    const emailOk = await validateContactEmail(email);
    if (!emailOk) return;

    const addressText = businessAddress.trim();
    if (!addressText || !businessPlaceId.trim()) {
      setFormError("Select your business location from the Google address suggestions.");
      toast.error("Select a verified Google address suggestion.");
      return;
    }

    setIsLoading(true);
    try {
      const websiteRaw = String(form.get("website") ?? "").trim();
      let website: string | undefined;
      if (websiteRaw) {
        try {
          website = normalizeWebsiteUrl(websiteRaw) ?? undefined;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Enter a valid website address.";
          setFormError(message);
          toast.error(message);
          return;
        }
      }

      const res = await submitPartnerApplication({
        businessName: String(form.get("businessName") ?? "").trim(),
        businessType: String(form.get("businessType") ?? "").trim(),
        contactName: String(form.get("contactName") ?? "").trim(),
        contactEmail: email,
        contactPhone: String(form.get("contactPhone") ?? "").trim(),
        address: addressText,
        city: String(form.get("city") ?? "").trim(),
        state: String(form.get("state") ?? "").trim(),
        businessLocation: { text: addressText, placeId: businessPlaceId.trim() },
        website,
        notes: String(form.get("notes") ?? "").trim() || undefined,
      });
      toast.success(res.message ?? "Application submitted.");
      setSubmitted(true);
    } catch (err) {
      if (applyContactEmailError(err)) {
        toast.error(err instanceof ApiError ? err.message : "Invalid email.");
        return;
      }

      const message =
        err instanceof ApiError
          ? err.message
          : "Could not submit application. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <aside className="h-fit rounded-3xl border border-aleet-border bg-aleet-card p-6 shadow-[0_14px_44px_rgba(26,21,16,0.08)] sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-aleet-gold/10 text-aleet-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-5 font-serif text-2xl text-aleet-text">Application received</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-aleet-text-muted">
          Our team will review your business details. Once approved, you&apos;ll receive
          your partner page, QR code, and dashboard access.
        </p>
        <p className="mt-4 text-[13px] text-aleet-text-subtle">
          Typical review time: 2–3 business days.
        </p>
        <PartnerDashboardNavButton
          className="mt-6"
          href="/partners/login"
          label="Partner sign in"
          hint="After approval, you'll receive an invite email. Then use partner sign in to access your dashboard."
        />
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-3xl border border-aleet-border bg-aleet-card p-6 shadow-[0_14px_44px_rgba(26,21,16,0.08)] sm:p-8">
      <h2 className="font-serif text-2xl text-aleet-text">Apply to partner</h2>
      <p className="mt-2 text-[14px] text-aleet-text-muted">
        Submit your venue details. Applications remain pending until admin approval.
      </p>
      <p className="mt-3 text-[13px] text-aleet-text-subtle">
        Already approved?{" "}
        <Link href="/partners/login" className="font-semibold text-aleet-gold no-underline hover:underline">
          Partner sign in
        </Link>
        .
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Business name" name="businessName" required />
        <Field label="Business type" name="businessType" placeholder="Hotel, Lounge, Casino…" required />
        <Field label="Contact name" name="contactName" required />
        <div>
          <label htmlFor="contactEmail" className="mb-2 block text-sm text-aleet-text-muted">
            Contact email
          </label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => handleContactEmailChange(e.target.value)}
            onBlur={() => void validateContactEmail(contactEmail)}
            required
            aria-invalid={Boolean(contactEmailError)}
            aria-describedby={contactEmailError ? "contactEmail-error" : undefined}
          />
          {checkingEmail ? (
            <p className="mt-1.5 text-[12px] text-aleet-text-subtle">Checking email…</p>
          ) : null}
          {contactEmailError ? (
            <div id="contactEmail-error">
              <PartnerContactEmailError
                message={contactEmailError}
                detail={contactEmailDetail}
              />
            </div>
          ) : null}
        </div>
        <Field label="Contact phone" name="contactPhone" type="tel" required />
        <div>
          <AddressAutocomplete
            label="Business location (Google verified)"
            value={businessAddress}
            onChange={(value) => {
              setBusinessAddress(value);
              setBusinessPlaceId("");
              setFormError(null);
            }}
            onPlaceChange={(place) => {
              setBusinessAddress(place.text);
              setBusinessPlaceId(place.placeId);
              setFormError(null);
            }}
            placeholder="Start typing your street address…"
          />
          <p className="mt-1.5 text-[12px] text-aleet-text-subtle">
            Pick a suggestion so distance and mileage calculations use a verified place ID.
          </p>
          {businessAddress && !businessPlaceId ? (
            <p className="mt-1 text-[12px] text-amber-700">Select an address from the list.</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" required />
          <Field label="State" name="state" required />
        </div>
        <Field label="Website" name="website" placeholder="mango.com or https://mango.com" />
        <div>
          <label htmlFor="notes" className="mb-2 block text-sm text-aleet-text-muted">
            Additional notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-aleet-border-strong bg-aleet-cream px-[14px] py-3 text-[15px] text-aleet-text outline-none placeholder:text-aleet-text-subtle focus:border-aleet-gold"
            placeholder="Tell us about your venue and guest volume…"
          />
        </div>
        <Button type="submit" isLoading={isLoading} disabled={Boolean(contactEmailError) || checkingEmail}>
          Submit Application
        </Button>
        {formError ? (
          <p className="text-[13px] text-red-600">{formError}</p>
        ) : null}
      </form>
    </aside>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-aleet-text-muted">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

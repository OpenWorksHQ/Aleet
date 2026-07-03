"use client";

import { useState } from "react";
import { Button, Input, toast } from "@/app/components/ui";
import { submitPartnerApplication } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";

export function PartnerApplicationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);

    setIsLoading(true);
    try {
      const res = await submitPartnerApplication({
        businessName: String(form.get("businessName") ?? "").trim(),
        businessType: String(form.get("businessType") ?? "").trim(),
        contactName: String(form.get("contactName") ?? "").trim(),
        contactEmail: String(form.get("contactEmail") ?? "").trim(),
        contactPhone: String(form.get("contactPhone") ?? "").trim(),
        address: String(form.get("address") ?? "").trim(),
        city: String(form.get("city") ?? "").trim(),
        state: String(form.get("state") ?? "").trim(),
        website: String(form.get("website") ?? "").trim() || undefined,
        notes: String(form.get("notes") ?? "").trim() || undefined,
      });
      toast.success(res.message ?? "Application submitted.");
      setSubmitted(true);
    } catch (err) {
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
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-3xl border border-aleet-border bg-aleet-card p-6 shadow-[0_14px_44px_rgba(26,21,16,0.08)] sm:p-8">
      <h2 className="font-serif text-2xl text-aleet-text">Apply to partner</h2>
      <p className="mt-2 text-[14px] text-aleet-text-muted">
        Submit your venue details. Applications remain pending until admin approval.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Business name" name="businessName" required />
        <Field label="Business type" name="businessType" placeholder="Hotel, Lounge, Casino…" required />
        <Field label="Contact name" name="contactName" required />
        <Field label="Contact email" name="contactEmail" type="email" required />
        <Field label="Contact phone" name="contactPhone" type="tel" required />
        <Field label="Street address" name="address" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" required />
          <Field label="State" name="state" required />
        </div>
        <Field label="Website" name="website" type="url" placeholder="https://" />
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
        <Button type="submit" isLoading={isLoading}>
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

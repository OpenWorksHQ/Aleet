"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  submitInvestorAccessRequest,
  type InvestorRole,
} from "@/lib/api/teams";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROLES: { value: InvestorRole; label: string }[] = [
  { value: "investor", label: "Investor" },
  { value: "operator", label: "Operator / Expansion" },
  { value: "legal", label: "Legal / Leadership" },
  { value: "other", label: "Other" },
];

const CONFIRMATION_HEADLINE = "Thank you";
const CONFIRMATION_MESSAGE =
  "We received your information and will get back to you.";

export function AccessRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<InvestorRole>("investor");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const linkedinOrWebsite = String(formData.get("linkedinOrWebsite") ?? "").trim();
    const background = String(formData.get("background") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phoneOrCalendly = String(formData.get("phoneOrCalendly") ?? "").trim();

    if (!fullName) {
      setErrorMessage("Full name is required.");
      return;
    }

    if (!email && !phoneOrCalendly) {
      setErrorMessage("Please provide an email or phone/Calendly link.");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitInvestorAccessRequest({
        fullName,
        role,
        linkedinOrWebsite: linkedinOrWebsite || undefined,
        background: background || undefined,
        email: email || undefined,
        phoneOrCalendly: phoneOrCalendly || undefined,
      });

      setSubmittedName(fullName);
      setIsSubmitted(true);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return <SubmissionSuccess name={submittedName} />;
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <FormField label="Full Name" htmlFor="full-name" required>
        <PortalInput id="full-name" name="fullName" required autoComplete="name" />
      </FormField>

      <fieldset>
        <legend className="mb-3 text-[13px] text-[#8a8a8a]">Role</legend>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {ROLES.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[#d8d8d8]"
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 shrink-0 rounded-full border",
                  role === option.value
                    ? "border-[#bca066] bg-[#bca066]"
                    : "border-[#4a4a4a] bg-transparent",
                )}
                aria-hidden
              />
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label="LinkedIn or Website" htmlFor="linkedin-website">
        <PortalInput
          id="linkedin-website"
          name="linkedinOrWebsite"
          type="url"
          placeholder="https://"
        />
      </FormField>

      <FormField label="Summary of Background / Experience" htmlFor="background">
        <textarea
          id="background"
          name="background"
          rows={4}
          placeholder="Why are you right for Aleet's team? What value do you bring?"
          className="min-h-[112px] w-full resize-y rounded-lg border border-[#2a2a2a] bg-[#111111] px-3.5 py-3 text-[14px] text-[#e8e8e8] outline-none placeholder:text-[#5a5a5e] focus:border-[#4a4a4a]"
        />
      </FormField>

      <FormField label="Email" htmlFor="email" hint="Optional">
        <PortalInput id="email" name="email" type="email" autoComplete="email" />
      </FormField>

      <FormField label="Phone or Calendly Link" htmlFor="phone-or-calendly">
        <PortalInput
          id="phone-or-calendly"
          name="phoneOrCalendly"
          autoComplete="tel"
        />
      </FormField>

      {errorMessage ? (
        <p className="text-[13px] text-[#d48484]" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#bca066] text-[15px] font-semibold text-[#1a1a1a] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          "Submitting..."
        ) : (
          <>
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            Submit
          </>
        )}
      </button>
    </form>
  );
}

function SubmissionSuccess({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <div
      className="overflow-hidden rounded-xl border border-[#bca066]/20 bg-[#111111]"
      role="status"
      aria-live="polite"
    >
      <div className="h-px bg-linear-to-r from-transparent via-[#bca066]/60 to-transparent" />

      <div className="flex flex-col items-center px-6 py-10 text-center sm:px-8 sm:py-12">
        <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#bca066]/35 bg-[#bca066]/10">
          <Check className="h-6 w-6 text-[#bca066]" strokeWidth={2.25} aria-hidden />
        </span>

        <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.02em] text-white">
          {CONFIRMATION_HEADLINE}
          {firstName ? `, ${firstName}` : ""}
        </h3>

        <p className="mt-3 max-w-[300px] text-[15px] leading-[1.65] text-[#b8b8b8]">
          {CONFIRMATION_MESSAGE}
        </p>

        <div className="mt-8 w-full max-w-[280px] border-t border-[#2a2a2a] pt-6">
          <p className="text-[12px] uppercase tracking-[0.12em] text-[#666666]">
            Submission received
          </p>
          <p className="mt-2 text-[13px] leading-normal text-[#8a8a8a]">
            Our team will review your details and follow up directly.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[13px] text-[#8a8a8a]">
        {label}
        {hint ? <span className="text-[#666666]"> ({hint})</span> : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {children}
    </div>
  );
}

function PortalInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[46px] w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3.5 text-[14px] text-[#e8e8e8] outline-none placeholder:text-[#5a5a5e] focus:border-[#4a4a4a]",
        className,
      )}
      {...props}
    />
  );
}

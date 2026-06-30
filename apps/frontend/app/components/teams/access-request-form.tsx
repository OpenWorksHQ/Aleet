"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "@/app/components/ui";
import { cn } from "@/lib/utils";

type InvestorRole = "investor" | "operator" | "legal";

const ROLES: { value: InvestorRole; label: string }[] = [
  { value: "investor", label: "Investor" },
  { value: "operator", label: "Operator / Expansion" },
  { value: "legal", label: "Legal / Leadership" },
];

export function AccessRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<InvestorRole>("investor");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Request received. Our team will follow up shortly.");
      form.reset();
      setRole("investor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <FormField label="Full Name" htmlFor="full-name" required>
        <PortalInput id="full-name" name="fullName" required autoComplete="name" />
      </FormField>

      <FormField label="City / Market" htmlFor="city-market" required>
        <PortalInput id="city-market" name="cityMarket" required />
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

      <FormField label="Phone or Calendly link" htmlFor="contact">
        <PortalInput id="contact" name="contact" autoComplete="tel" />
      </FormField>

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
            Request Access
          </>
        )}
      </button>
    </form>
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

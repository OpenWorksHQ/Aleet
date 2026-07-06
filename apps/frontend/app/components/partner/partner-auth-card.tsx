"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  MarketingPageShell,
  MarketingSection,
} from "@/app/components/marketing-page-shell";
import { PartnerDashboardNavButton } from "@/app/components/partner/partner-dashboard-nav-button";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showDashboardNav?: boolean;
};

export function PartnerAuthCard({
  title,
  subtitle,
  children,
  footer,
  showDashboardNav = true,
}: Props) {
  return (
    <MarketingPageShell showMarketingNav={false}>
      <MarketingSection className="py-10 sm:py-14">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
              Partner Portal
            </p>
            <h1 className="mt-2 font-serif text-3xl text-aleet-text">{title}</h1>
            <p className="mt-2 text-sm text-aleet-text-muted">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-aleet-border bg-aleet-card px-6 py-8 shadow-sm">
            {children}
          </div>
          {footer ? (
            <div className="mt-5 text-center text-[13px] text-aleet-text-muted">{footer}</div>
          ) : null}
          {showDashboardNav ? (
            <PartnerDashboardNavButton
              className="mt-5 text-center"
              hint="After you activate your account, use this to open your partner dashboard."
            />
          ) : null}
          <p className="mt-6 text-center text-[13px] text-aleet-text-muted">
            <Link href="/partners" className="font-semibold text-aleet-gold no-underline hover:underline">
              ← Partner program
            </Link>
          </p>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-aleet-border bg-aleet-cream px-3 py-2.5 text-sm text-aleet-text outline-none focus:border-aleet-gold/40";

export function PartnerAuthField({
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-aleet-text-subtle">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className={inputClass}
      />
    </label>
  );
}

export const partnerAuthInputClass = inputClass;

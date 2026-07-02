import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";
import { SiteFooter } from "./site-footer";

type MarketingPageShellProps = {
  children: ReactNode;
  showMarketingNav?: boolean;
  showFooter?: boolean;
  className?: string;
};

export function MarketingPageShell({
  children,
  showMarketingNav = true,
  showFooter = true,
  className,
}: MarketingPageShellProps) {
  return (
    <div className={cn("min-h-screen bg-aleet-cream text-aleet-text", className)}>
      <AppHeader showMarketingNav={showMarketingNav} />
      {children}
      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}

type MarketingSectionProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MarketingSection({
  children,
  className,
  contentClassName,
}: MarketingSectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden px-5 py-12 sm:px-8 sm:py-16 lg:px-12 xl:px-16",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-size-[28px_28px] opacity-35 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)]" />
      <div className={cn("relative mx-auto w-full max-w-[1440px]", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

type RedirectShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function RedirectShell({ eyebrow, title, subtitle }: RedirectShellProps) {
  return (
    <MarketingPageShell showFooter={false}>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-5 py-16 text-center">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute -inset-8 bg-size-[28px_28px] opacity-35 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)]" />
          <div className="relative rounded-3xl border border-aleet-border bg-aleet-card px-8 py-10 shadow-[0_14px_44px_rgba(26,21,16,0.08)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
              {eyebrow}
            </p>
            <p className="mt-4 font-serif text-2xl text-aleet-text">{title}</p>
            <p className="mt-3 text-sm leading-relaxed text-aleet-text-muted">{subtitle}</p>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}

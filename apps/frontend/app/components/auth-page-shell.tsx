import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { SiteFooter } from "./site-footer";

type AuthPageShellProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
};

export function AuthPageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-aleet-cream text-aleet-text">
      <AppHeader />

      <div className="relative flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-24">
          <div className="pointer-events-none absolute inset-0 bg-size-[28px_28px] opacity-35 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)]" />
          <div className="relative max-w-lg">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
              {eyebrow}
            </p>
            <h1 className="mt-4 font-serif text-[44px] leading-[1.08] text-aleet-text xl:text-[52px]">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-aleet-text-muted">
              {subtitle}
            </p>

            <div className="mt-10 space-y-4 border-t border-aleet-border pt-8">
              <AuthHighlight
                title="Members-only access"
                text="Book transportation, event access, and concierge services in one place."
              />
              <AuthHighlight
                title="Trusted professionals"
                text="Every driver is verified and committed to your safety and discretion."
              />
              <AuthHighlight
                title="Always here"
                text="Support before, during, and after every experience."
              />
            </div>
          </div>
        </section>

        <section className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-10 lg:py-14 xl:px-14">
          <div className="pointer-events-none absolute inset-0 bg-size-[28px_28px] opacity-25 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)] lg:hidden" />
          <div className="relative w-full max-w-[480px]">
            <div className="mb-8 text-center lg:hidden">
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-aleet-gold">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-serif text-[34px] leading-[1.1] text-aleet-text">
                {title}
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-aleet-text-muted">
                {subtitle}
              </p>
            </div>

            <div className="rounded-3xl border border-aleet-border bg-aleet-card p-5 shadow-[0_14px_44px_rgba(26,21,16,0.08)] sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}

function AuthHighlight({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-[14px] font-semibold text-aleet-text">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-aleet-text-muted">{text}</p>
    </div>
  );
}

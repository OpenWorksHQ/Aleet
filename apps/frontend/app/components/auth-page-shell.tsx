import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { SiteFooter } from "./site-footer";

type AuthPageShellProps = {
  children: ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-aleet-cream text-aleet-text">
      <AppHeader />

      <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-size-[28px_28px] opacity-35 bg-[radial-gradient(circle_at_1px_1px,rgba(140,125,95,0.12)_1px,transparent_0)]" />
        <div className="relative w-full max-w-[480px]">
          <div className="rounded-3xl border border-aleet-border bg-aleet-card p-5 shadow-[0_14px_44px_rgba(26,21,16,0.08)] sm:p-8">
            {children}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MOBILE_MENU_NAV } from "@/lib/nav-config";
import { AUTH_CHANGED_EVENT, getToken } from "@/lib/auth";

type SiteMenuProps = {
  className?: string;
};

export function SiteMenu({ className }: SiteMenuProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshAuth = useCallback(() => {
    setIsAuthenticated(Boolean(getToken()));
  }, []);

  const openMenu = () => setIsMounted(true);
  const closeMenu = () => setIsVisible(false);

  useEffect(() => {
    refreshAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  }, [refreshAuth]);

  useEffect(() => {
    if (!isMounted) return;
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    const originalOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMounted]);

  useEffect(() => {
    if (isVisible || !isMounted) return;
    const timeout = window.setTimeout(() => setIsMounted(false), 260);
    return () => window.clearTimeout(timeout);
  }, [isVisible, isMounted]);

  return (
    <>
      <button
        className={cn(
          "inline-flex h-7.5 w-9.5 cursor-pointer flex-col justify-center gap-1.25 border-0 bg-transparent",
          className,
        )}
        type="button"
        aria-label={isMounted ? "Close menu" : "Open menu"}
        aria-expanded={isMounted}
        onClick={() => {
          if (isMounted) {
            closeMenu();
            return;
          }
          openMenu();
        }}
      >
        <span className="h-0.5 w-6.5 rounded-xs bg-aleet-gold" />
        <span className="h-0.5 w-6.5 rounded-xs bg-aleet-gold" />
        <span className="h-0.5 w-6.5 rounded-xs bg-aleet-gold" />
      </button>

      {isMounted ? (
        <div className="fixed inset-0" style={{ zIndex: 9999 }}>
          <button
            type="button"
            aria-label="Close menu overlay"
            className={cn(
              "absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-250",
              isVisible ? "opacity-100" : "opacity-0",
            )}
            onClick={closeMenu}
          />

          <aside
            className={cn(
              "relative z-10 flex h-full w-full max-w-[320px] flex-col bg-aleet-cream shadow-[16px_0_48px_rgba(26,21,16,0.12)] transition-transform duration-250 ease-out",
              isVisible ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between border-b border-aleet-border px-6 py-5">
              <Link
                href="/"
                className="text-[18px] font-normal tracking-[0.28em] text-aleet-text no-underline"
                onClick={closeMenu}
              >
                ALEET
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-aleet-border bg-aleet-card text-aleet-text-muted transition-colors hover:border-aleet-gold/40 hover:text-aleet-text"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-aleet-text-subtle">
                Explore
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {MOBILE_MENU_NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted"
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-aleet-text-subtle">
                Account
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted"
                      onClick={closeMenu}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/booking"
                      className="rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted"
                      onClick={closeMenu}
                    >
                      Book a Trip
                    </Link>
                    <Link
                      href="/subscription"
                      className="rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted"
                      onClick={closeMenu}
                    >
                      Membership
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted"
                      onClick={closeMenu}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/membership"
                      className="rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted"
                      onClick={closeMenu}
                    >
                      View Membership
                    </Link>
                  </>
                )}
              </div>
            </nav>

            <div className="border-t border-aleet-border px-4 py-5">
              <Link
                href={isAuthenticated ? "/booking" : "/login"}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-black text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
                onClick={closeMenu}
              >
                {isAuthenticated ? "Book a Trip" : "Join Aleet"}
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

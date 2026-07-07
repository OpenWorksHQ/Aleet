"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  loadPartnerAuthToken,
  PARTNER_AUTH_CHANGED_EVENT,
} from "@/lib/partner/auth";
import { cn } from "@/lib/utils";

type PartnerAuthNavLinkProps = {
  variant?: "header" | "menu" | "account-menu" | "button";
  className?: string;
  onNavigate?: () => void;
};

export function PartnerAuthNavLink({
  variant = "header",
  className,
  onNavigate,
}: PartnerAuthNavLinkProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refresh = useCallback(() => {
    setIsLoggedIn(Boolean(loadPartnerAuthToken()));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(PARTNER_AUTH_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(PARTNER_AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const href = isLoggedIn ? "/partners/dashboard" : "/partners/login";
  const label = isLoggedIn ? "Partner dashboard" : "Partner sign in";

  if (variant === "button") {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-aleet-gold px-4 py-2.5 text-[13px] font-semibold text-black no-underline transition-opacity hover:opacity-90",
          className,
        )}
      >
        {label}
      </Link>
    );
  }

  if (variant === "menu") {
    return (
      <Link
        href={href}
        className={cn(
          "rounded-xl px-3 py-3 text-[15px] font-medium text-aleet-text no-underline transition-colors hover:bg-aleet-cream-muted",
          className,
        )}
        onClick={onNavigate}
      >
        {label}
      </Link>
    );
  }

  if (variant === "account-menu") {
    return (
      <Link
        href={href}
        role="menuitem"
        className={cn(
          "block px-4 py-2.5 text-[13px] text-aleet-text no-underline transition-colors hover:bg-aleet-cream",
          className,
        )}
        onClick={onNavigate}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "hidden text-[13px] text-white/85 no-underline transition-colors hover:text-white sm:inline xl:text-[14px]",
        className,
      )}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { AUTH_CHANGED_EVENT, getToken, removeToken } from "@/lib/auth";
import { getProfile } from "@/lib/api/users";
import type { User } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { DriverPortalNavLink } from "@/app/components/driver-portal-nav-link";
import { PartnerAuthNavLink } from "@/app/components/partner/partner-auth-nav-link";

type AuthStatus = "loading" | "guest" | "authenticated";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Member";
}

export function HeaderAuthActions() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStatus("guest");
      return;
    }

    try {
      const res = await getProfile(token);
      if (res.data) {
        setUser(res.data);
        setStatus("authenticated");
        return;
      }
    } catch {
      removeToken();
    }

    setUser(null);
    setStatus("guest");
  }, []);

  useEffect(() => {
    void refreshAuth();

    const onAuthChanged = () => {
      void refreshAuth();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener("focus", onAuthChanged);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener("focus", onAuthChanged);
    };
  }, [refreshAuth]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-auth-menu]")) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    removeToken();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-4 sm:gap-5" aria-hidden>
        <div className="hidden h-4 w-14 animate-pulse rounded bg-white/10 sm:block" />
        <div className="h-9 w-[108px] animate-pulse rounded-md bg-white/10 sm:w-[118px]" />
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div className="flex items-center gap-4 sm:gap-5">
        <Link
          href="/login"
          className="hidden text-[13px] text-white/85 no-underline transition-colors hover:text-white sm:inline xl:text-[14px]"
        >
          Log In
        </Link>
        <DriverPortalNavLink variant="become-a-driver" />
      </div>
    );
  }

  const displayName = user?.name ? getFirstName(user.name) : "Member";

  return (
    <div className="relative" data-auth-menu>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Account menu"
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-1.5 pr-2.5 text-left transition-colors hover:border-aleet-gold/40 hover:bg-white/10 sm:pl-2 sm:pr-3",
          menuOpen && "border-aleet-gold/40 bg-white/10",
        )}
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aleet-gold text-[11px] font-semibold text-black sm:h-8 sm:w-8 sm:text-[12px]">
          {getInitials(user?.name ?? "Member")}
        </span>
        <span className="hidden max-w-[120px] truncate text-[13px] text-white/90 sm:inline xl:max-w-[140px] xl:text-[14px]">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-white/60 transition-transform duration-200",
            menuOpen && "rotate-180",
          )}
        />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-aleet-border bg-aleet-card py-1.5 shadow-[0_16px_40px_rgba(26,21,16,0.18)]"
        >
          <div className="border-b border-aleet-border px-4 py-3">
            <p className="truncate text-[13px] font-semibold text-aleet-text">
              {user?.name ?? "Member"}
            </p>
            <p className="truncate text-[12px] text-aleet-text-muted">
              {user?.email || user?.phone}
            </p>
          </div>

          <Link
            href="/dashboard"
            role="menuitem"
            className="block px-4 py-2.5 text-[13px] text-aleet-text no-underline transition-colors hover:bg-aleet-cream"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/booking"
            role="menuitem"
            className="block px-4 py-2.5 text-[13px] text-aleet-text no-underline transition-colors hover:bg-aleet-cream"
            onClick={() => setMenuOpen(false)}
          >
            Book a Trip
          </Link>

          <PartnerAuthNavLink
            variant="account-menu"
            onNavigate={() => setMenuOpen(false)}
          />

          <div className="my-1 border-t border-aleet-border" />

          <DriverPortalNavLink
            variant="account-menu"
            onNavigate={() => setMenuOpen(false)}
          />

          <div className="my-1 border-t border-aleet-border" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="inline-flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-[13px] text-aleet-text-muted transition-colors hover:bg-aleet-cream hover:text-aleet-text"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      ) : null}
    </div>
  );
}

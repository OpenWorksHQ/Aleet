"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  loadPartnerAuthToken,
  PARTNER_AUTH_CHANGED_EVENT,
} from "@/lib/partner/auth";
import { PartnerDashboardNavButton } from "@/app/components/partner/partner-dashboard-nav-button";

export function PartnerPortalActions() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refresh = useCallback(() => {
    setIsLoggedIn(Boolean(loadPartnerAuthToken()));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(PARTNER_AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PARTNER_AUTH_CHANGED_EVENT, refresh);
  }, [refresh]);

  if (isLoggedIn) {
    return (
      <div className="mt-5">
        <PartnerDashboardNavButton label="Go to partner dashboard →" />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Link
        href="/partners/login"
        className="inline-flex rounded-xl border border-aleet-border bg-aleet-card px-4 py-2.5 text-[13px] font-semibold text-aleet-text no-underline transition-colors hover:border-aleet-gold/40"
      >
        Partner sign in →
      </Link>
    </div>
  );
}

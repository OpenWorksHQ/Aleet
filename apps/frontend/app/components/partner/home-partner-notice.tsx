"use client";

import { useEffect, useState } from "react";
import { Building2, Tag, X } from "lucide-react";
import {
  clearPartnerContext,
  loadPartnerContext,
  PARTNER_CHANGED_EVENT,
} from "@/lib/partner/attribution";
import type { PartnerContext } from "@/lib/partner/types";

export function HomePartnerNotice() {
  const [partner, setPartner] = useState<PartnerContext | null>(null);

  useEffect(() => {
    setPartner(loadPartnerContext());
    const refresh = () => setPartner(loadPartnerContext());
    window.addEventListener(PARTNER_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PARTNER_CHANGED_EVENT, refresh);
  }, []);

  if (!partner) return null;

  const isVenueAccess = partner.bookingMode === "venue_access";

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#c5a386]/30 bg-black/90 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#c5a386]/15 text-[#c5a386]">
          {isVenueAccess ? (
            <Building2 className="h-3.5 w-3.5" />
          ) : (
            <Tag className="h-3.5 w-3.5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-white">
            Booking through {partner.partnerName}
          </p>
          <p className="truncate text-[11px] text-white/55">
            {isVenueAccess ? "Venue Access" : "Partner booking"} · code applied
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          clearPartnerContext();
          setPartner(null);
        }}
        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:text-white"
        aria-label="Clear partner context"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

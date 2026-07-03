"use client";

import { Building2, Tag, X } from "lucide-react";
import type { PartnerContext } from "@/lib/partner/types";
import { clearPartnerContext } from "@/lib/partner/attribution";
import { cn } from "@/lib/utils";

type PartnerContextBannerProps = {
  partner: PartnerContext;
  className?: string;
  onClear?: () => void;
  compact?: boolean;
};

export function PartnerContextBanner({
  partner,
  className,
  onClear,
  compact = false,
}: PartnerContextBannerProps) {
  const isVenueAccess = partner.bookingMode === "venue_access";

  return (
    <div
      className={cn(
        "rounded-2xl border border-aleet-gold/30 bg-aleet-gold/10 px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aleet-gold/15 text-aleet-gold">
            {isVenueAccess ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <Tag className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-aleet-gold">
              {isVenueAccess ? "Venue Access" : "Partner Booking"}
            </p>
            <p className="mt-1 text-[15px] font-semibold text-aleet-text">
              Booking through {partner.partnerName}
            </p>
            {!compact && (
              <p className="mt-1 text-[13px] text-aleet-text-muted">
                {isVenueAccess
                  ? partner.pickupLocation?.text
                    ? `Pickup: ${partner.pickupLocation.text}`
                    : "Your partner venue has been attached to this reservation."
                  : partner.discountPct
                    ? `${partner.discountPct}% partner discount will be applied at checkout.`
                    : "This booking will be attributed to your partner."}
              </p>
            )}
            {partner.pricingNote ? (
              <p className="mt-1 text-[12px] text-aleet-text-subtle">{partner.pricingNote}</p>
            ) : null}
          </div>
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={() => {
              clearPartnerContext();
              onClear();
            }}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-aleet-border bg-aleet-card text-aleet-text-subtle transition-colors hover:text-aleet-text"
            aria-label="Clear partner context"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
